import { diff } from 'jest-diff';
import {
  makeScopeImpl,
  makeSubscriberManager,
  Reducer,
  Store,
  SubscriberManager,
} from './framework';
import { deepClone, deepEqual } from './util';

export type TestStoreStep<S, A> =
  | { tag: 'send'; action: A; update: (state: S) => S }
  | { tag: 'receive'; action: A; update: (state: S) => S }
  | { tag: 'do'; do: () => void };

export function send<S, A>(
  action: A,
  update: (s: S) => S,
): TestStoreStep<S, A> {
  return { tag: 'send', action, update };
}

export function receive<S, A>(
  action: A,
  update: (s: S) => S,
): TestStoreStep<S, A> {
  return { tag: 'receive', action, update };
}

type TestStoreAssertion<S, A> = (...steps: TestStoreStep<S, A>[]) => void;

export interface TestStore<S, A> extends Store<S, A> {
  assert: TestStoreAssertion<S, A>;
  assertSnapshot(expected: { action?: A; state: S }[]): void;
}

export function makeTestStore<S, A, R>(
  initialState: S,
  env: R,
  reducer: Reducer<S, A, R>,
): TestStore<S, A> {
  let state = initialState;

  const manager = makeSubscriberManager<S>(state, true);
  const actionQueue: A[] = [];

  // Track all state transitions
  const history: { action?: A; state: S }[] = [{ state: deepClone(state) }];

  const processAction = (action: A) => {
    const [newState, effect] = reducer.reduce(state, action, env);
    state = newState;

    history.push({ state: newState, action });

    manager.setState(state);
    effect.unsafeRun((producedAction) => {
      actionQueue.push(producedAction);
    });
  };

  const send = (action: A) => {
    processAction(action);
    manager.notify();
  };

  const baseStore: Store<S, A> = {
    subscribe: manager.subscribe,
    send,
    scope: makeScopeImpl<S, A>({
      subscribe: manager.subscribe,
      send,
    }),
  };

  const drainEffects = () => {
    while (actionQueue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const action = actionQueue.shift()!;
      processAction(action);
      manager.notify();
    }
  };

  function assertSnapshot(expected: { action?: A; state: S }[]): void {
    drainEffects();

    const actualState = JSON.stringify(history, null, 2);
    const expectedState = JSON.stringify(expected, null, 2);

    if (actualState !== expectedState) {
      const stateDiff = diff(expectedState, actualState, {
        expand: false,
        contextLines: 3,
      });

      throw new Error(`State mismatch:\n${stateDiff}`);
    }
  }

  return {
    ...baseStore,
    assert: makeAssert(manager, actionQueue, processAction),
    assertSnapshot,
  };
}

function makeAssert<S, A>(
  manager: SubscriberManager<S>,
  actionQueue: A[],
  processAction: (a: A) => void,
): TestStoreAssertion<S, A> {
  return (...steps) => {
    const initialState = manager.getState();
    const queueSnapshot = [...actionQueue];

    try {
      let expectedState = structuredClone(initialState);

      function handleStep(step: { action: A; update: (s: S) => S }) {
        expectedState = step.update(expectedState);
        processAction(step.action);
        manager.notify();
        validateState(expectedState);
      }

      steps.forEach((step) => {
        switch (step.tag) {
          case 'send':
            handleStep(step);
            break;

          case 'receive': {
            validateActionQueue();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const receivedAction = actionQueue.shift()!;
            validateAction(receivedAction, step.action);

            handleStep(step);
            break;
          }
          case 'do':
            step.do();
            break;
        }
      });

      validateActionQueueExhausted();
    } catch (error) {
      resetState(initialState, queueSnapshot);
      throw error;
    }

    // Helper functions
    function validateState(expected: S) {
      if (!deepEqual(manager.getState(), expected)) {
        throw new Error(`State mismatch:\n
          Expected: ${JSON.stringify(expected)}\n
          Actual:   ${JSON.stringify(manager.getState())}`);
      }
    }

    function validateActionQueue() {
      if (actionQueue.length === 0) {
        throw new Error('No actions to receive');
      }
    }

    function validateAction(received: A, expected: A) {
      if (!deepEqual(received, expected)) {
        throw new Error(`Action mismatch:\n
          Expected: ${JSON.stringify(expected)}\n
          Received: ${JSON.stringify(received)}`);
      }
    }

    function validateActionQueueExhausted() {
      if (actionQueue.length > 0) {
        throw new Error(`${actionQueue.length} unprocessed actions remaining`);
      }
    }

    function resetState(initial: S, queue: A[]) {
      manager.setState(initial);
      actionQueue.length = 0;
      actionQueue.push(...queue);
    }
  };
}
