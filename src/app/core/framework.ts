import { Observable } from 'rxjs';
import { Lens, Prism } from './optics';
import { absurd, compose, deepEqual } from './util';

// -----------------------------------------------------------------

type Callback<A> = (a: A) => void;

class Effect<A> {
  unsafeRun: (cb: Callback<A>) => void;

  constructor(unsafeRun: (cb: Callback<A>) => void) {
    this.unsafeRun = unsafeRun;
  }

  // Semigroup; associative but not commutative. law: a <> (b <> c) = (a <> b) <> c
  merge(rhs: Effect<A>): Effect<A> {
    return new Effect((cb) => {
      this.unsafeRun(cb);
      rhs.unsafeRun(cb);
    });
  }

  // Monoid; law: empty <> eff = eff <> empty = eff
  static empty<A>(): Effect<A> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Effect((_: Callback<A>) => {
      /* no-op */
    });
  }

  // Functor; law: map(f . g) = map(f) . map(g), map(id) = id
  map<B>(f: (a: A) => B): Effect<B> {
    return new Effect<B>((cb) => {
      this.unsafeRun((a) => {
        cb(f(a));
      });
    });
  }

  // Applicative (Pointed)
  static pure<A>(a: A): Effect<A> {
    return new Effect((cb) => cb(a));
  }

  toObservable(): Observable<A> {
    return new Observable((subscriber) =>
      this.unsafeRun((a) => subscriber.next(a)),
    );
  }

  // NOTE: not robust, there is no way to unsubscribe
  static fromObservable<A>(observable: Observable<A>): Effect<A> {
    return new Effect<A>((callback) => {
      observable.subscribe(callback);
    });
  }

  static void<A>(f: () => void): Effect<A> {
    return castNever<A>(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      new Effect<never>((_: Callback<never>) => {
        f();
      }),
    );
  }
}

function castNever<A>(eff: Effect<never>): Effect<A> {
  return eff.map(absurd<A>);
}

function concat<A>(...effs: Effect<A>[]): Effect<A> {
  return effs.reduce((x, y) => x.merge(y), Effect.empty());
}

// -----------------------------------------------------------------

interface Reducer<S, A, R> {
  reduce(state: S, action: A, env: R): [S, Effect<A>];
}

// Note, order matters. a <> b != b <> a
function concatReducers<S, A, R>(
  ...reducers: Reducer<S, A, R>[]
): Reducer<S, A, R> {
  return {
    reduce: (s, a, env) => {
      const eff: Effect<A>[] = [];
      reducers.forEach((r) => {
        const [newS, newEff] = r.reduce(s, a, env);
        s = newS;
        eff.push(newEff);
      });
      return [s, concat(...eff)];
    },
  };
}

function pullback<S, T, A, B, X, Y>(
  reducer: Reducer<T, B, Y>,
  lens: Lens<S, T>,
  prism: Prism<A, B>,
  env: (x: X) => Y,
): Reducer<S, A, X> {
  return {
    reduce: (s, a, x) => {
      const b = prism.extract(a);
      if (b === null) {
        return [s, Effect.empty()];
      }
      const [t, eff] = reducer.reduce(lens.get(s), b, env(x));
      return [lens.set(s, t), eff.map(prism.embed)];
    },
  };
}

// -----------------------------------------------------------------

interface Store<S, A> {
  /**
   * Subscribe to state updates for a store. This will provide canonical
   * instances of the current state. This is typically used to drive the
   * presentation layer.
   *
   * @param callback
   */
  subscribe(callback: Callback<S>): () => void;

  /**
   * Submit an action to the store to be processed by the reducer.
   *
   * @param action
   */
  send(action: A): void;

  /**
   * Provides a new `Store` with a narrowed focus.
   *
   * @param focusState - returns a "smaller" state from the provided "larger" state
   * @param embedAction - embeds an action from the "smaller" domain into the "larger" domain
   */
  scope<T, B>(
    focusState: (state: S) => T,
    embedAction: (b: B) => A,
  ): Store<T, B>;
}

export type TestStoreStep<S, A> =
  | { tag: 'send'; action: A; update: (state: S) => S }
  | { tag: 'receive'; action: A; update: (state: S) => S }
  | { tag: 'do'; do: () => void };

export function send<S, A>(action: A, update: (s: S) => S): TestStoreStep<S, A> {
  return { tag: 'send', action, update };
}

export function receive<S, A>(action: A, update: (s: S) => S): TestStoreStep<S, A> {
  return { tag: 'receive', action, update };
}

type TestStoreAssertion<S, A> = (...steps: TestStoreStep<S, A>[]) => void;

export interface TestStore<S, A> extends Store<S, A> {
  assert: TestStoreAssertion<S, A>;
}

interface SubscriberManager<S> {
  getState: () => S;
  setState: (newState: S) => void;
  subscribe: (callback: Callback<S>) => () => void;
  notify: () => void;
}

function makeSubscriberManager<S>(
  initialState: S,
  immediateCallback = false,
): SubscriberManager<S> {
  let state = initialState;
  const subscribers = new Map<string, Callback<S>>();

  const subscribe = (callback: Callback<S>): (() => void) => {
    const uuid = crypto.randomUUID();
    subscribers.set(uuid, callback);
    if (immediateCallback) callback(state);
    return () => {
      subscribers.delete(uuid);
    };
  };

  const notify = () => {
    subscribers.forEach((sub) => sub(state));
  };

  return {
    getState: () => state,
    setState: (newState: S) => {
      state = newState;
    },
    subscribe,
    notify,
  };
}

function makeScopeImpl<S, A>(base: {
  subscribe: (cb: Callback<S>) => () => void;
  send: (a: A) => void;
}) {
  return <T, B>(
    focusState: (s: S) => T,
    embedAction: (b: B) => A,
  ): Store<T, B> => ({
    subscribe: (cb) => base.subscribe((s) => cb(focusState(s))),
    send: (b) => base.send(embedAction(b)),
    scope: <X, Y>(deeperFocus: (t: T) => X, deeperEmbed: (y: Y) => B) =>
      makeScopeImpl(base)(
        compose(deeperFocus, focusState),
        compose(embedAction, deeperEmbed),
      ),
  });
}

function makeStore<S, A, R>(
  initialState: S,
  env: R,
  reducer: Reducer<S, A, R>,
): Store<S, A> {
  const manager = makeSubscriberManager<S>(initialState);
  let state = manager.getState();

  const send = (action: A) => {
    const [newState, eff] = reducer.reduce(state, action, env);
    state = newState;
    manager.setState(state);
    manager.notify();
    eff.unsafeRun(send);
  };

  return {
    subscribe: manager.subscribe,
    send,
    scope: makeScopeImpl<S, A>({
      subscribe: manager.subscribe,
      send,
    }),
  };
}

export function makeTestStore<S, A, R>(
  initialState: S,
  env: R,
  reducer: Reducer<S, A, R>,
): TestStore<S, A> {
  const manager = makeSubscriberManager<S>(initialState, true);
  const actionQueue: A[] = [];
  let state = manager.getState();

  const processAction = (action: A) => {
    const [newState, effect] = reducer.reduce(state, action, env);
    state = newState;
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

  return {
    ...baseStore,
    assert: makeAssert(manager, actionQueue, processAction),
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

// ----------------------------------------------------------------

// ----------------------------------------------------------------

function loggingReducer<S, A, R>(
  reducer: Reducer<S, A, R>,
  logEffect: (entry: string) => Effect<never>,
): Reducer<S, A, R> {
  return {
    reduce: (state, action, env) => {
      const log1 = logEffect('ACTION: ' + JSON.stringify(action));
      const [newState, eff] = reducer.reduce(state, action, env);
      const log2 = logEffect('STATE: ' + JSON.stringify(newState));
      return [newState, concat(castNever<A>(log1), castNever<A>(log2), eff)];
    },
  };
}

export {
  Effect,
  makeStore,
  pullback,
  concatReducers,
  loggingReducer,
  compose,
  castNever,
};

export type { Reducer, Store };
