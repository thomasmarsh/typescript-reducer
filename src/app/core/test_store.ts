// Add deep equality check for state comparisons

import { compose, Reducer, Store } from './framework';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type Callback<S> = (s: S) => void;

// Update TestStoreStep type to match new assertion model
export type TestStoreStep<S, A> =
  | { tag: 'send'; action: A; update: (state: S) => void }
  | { tag: 'receive'; action: A; update: (state: S) => void }
  | { tag: 'do'; do: () => void };

export interface TestStore<S, A> extends Store<S, A> {
  assert(...steps: TestStoreStep<S, A>[]): void;
}

export function makeTestStore<S, A, R>(
  initialState: S,
  env: R,
  reducer: Reducer<S, A, R>,
): TestStore<S, A> {
  let state = initialState;
  const actionQueue: A[] = [];
  const subscribers: Callback<S>[] = [];

  // Notify subscribers of state changes
  const notify = () => {
    subscribers.forEach((cb) => cb(state));
  };

  // Process an action through the reducer
  const processAction = (action: A) => {
    const [newState, effect] = reducer.reduce(state, action, env);
    state = newState;

    // Capture effects synchronously
    effect.unsafeRun((producedAction) => {
      actionQueue.push(producedAction);
    });
  };

  const store: Store<S, A> = {
    subscribe: (callback) => {
      subscribers.push(callback);
      callback(state); // Immediately send current state
      return () => {
        const index = subscribers.indexOf(callback);
        if (index !== -1) subscribers.splice(index, 1);
      };
    },

    send: (action: A) => {
      processAction(action);
      notify();
    },

    scope: <T, B>(
      focusState: (s: S) => T,
      embedAction: (b: B) => A,
    ): Store<T, B> => ({
      subscribe: (cb) => store.subscribe((s) => cb(focusState(s))),
      send: (b) => store.send(embedAction(b)),
      scope: (deeperFocus, deeperEmbed) =>
        store.scope(
          compose(deeperFocus, focusState),
          compose(embedAction, deeperEmbed),
        ),
    }),
  };

  // TestStore-specific implementation
  const testStore: TestStore<S, A> = {
    ...store,

    assert(...steps: TestStoreStep<S, A>[]): void {
      let expectedState = JSON.parse(JSON.stringify(state));
      const queueSnapshot = [...actionQueue];

      try {
        steps.forEach((step) => {
          switch (step.tag) {
            case 'send': {
              const action = step.action;

              expectedState = step.update(expectedState);
              processAction(action);
              notify();

              if (!deepEqual(state, expectedState)) {
                throw new Error(`State mismatch after sending action:\n
                  Expected: ${JSON.stringify(expectedState)}\n
                  Actual:   ${JSON.stringify(state)}`);
              }
              break;
            }

            case 'receive': {
              if (actionQueue.length === 0) {
                throw new Error('No actions to receive');
              }

              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const receivedAction = actionQueue.shift()!;
              if (!deepEqual(receivedAction, step.action)) {
                throw new Error(`Action mismatch:\n
                  Expected: ${JSON.stringify(step.action)}\n
                  Received: ${JSON.stringify(receivedAction)}`);
              }

              expectedState = step.update(expectedState);
              processAction(receivedAction);
              notify();

              if (!deepEqual(state, expectedState)) {
                throw new Error(`State mismatch after receiving action:\n
                  Expected: ${JSON.stringify(expectedState)}\n
                  Actual:   ${JSON.stringify(state)}`);
              }
              break;
            }

            case 'do': {
              step.do();
              break;
            }
          }
        });

        // Verify all actions were processed
        if (actionQueue.length > 0) {
          throw new Error(
            `${actionQueue.length} unprocessed actions remaining in queue`,
          );
        }
      } catch (error) {
        // Restore original state on assertion failure
        state = JSON.parse(JSON.stringify(expectedState));
        actionQueue.length = 0;
        actionQueue.push(...queueSnapshot);
        throw error;
      }
    },
  };

  return testStore;
}
