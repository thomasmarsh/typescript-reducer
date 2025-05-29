import { logEffect } from './effect/log';

// (b -> c) -> (a -> b) -> (a -> c)
const compose =
  <A, B, C>(f: (b: B) => C, g: (a: A) => B) =>
  (a: A): C =>
    f(g(a));

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

  // Monad
  flatMap<B>(f: (a: A) => Effect<B>): Effect<B> {
    return new Effect<B>((cb) => {
      this.unsafeRun((a) => {
        f(a).unsafeRun(cb);
      });
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

function absurd<A>(_value: never): A {
  throw new Error(
    `ERROR! Reached forbidden function with unexpected value: ${JSON.stringify(
      _value,
    )}`,
  );
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

function makeStore<S, A, R>(
  initialState: S,
  env: R,
  reducer: Reducer<S, A, R>,
): Store<S, A> {
  type Callback = (s: S) => void;

  let state = initialState;
  const subscribers: Callback[] = [];

  const subscribe = (callback: Callback): (() => void) => {
    subscribers.push(callback);
    return () => {
      const index = subscribers.indexOf(callback);
      if (index !== -1) subscribers.splice(index, 1);
    };
  };

  // This is the simple definition, but can blow the stack:
  const send = (action: A) => {
    const [newState, eff] = reducer.reduce(state, action, env);
    state = newState;
    subscribers.forEach((sub) => sub(state));
    eff.unsafeRun(send);
  };

  const scope = <T, B>(
    focusState: (s: S) => T,
    embedAction: (b: B) => A,
  ): Store<T, B> => ({
    subscribe: (cb) => subscribe((s) => cb(focusState(s))),
    send: (b) => send(embedAction(b)),
    scope<X, Y>(
      deeperFocus: (t: T) => X,
      deeperEmbed: (y: Y) => B,
    ): Store<X, Y> {
      return scope<X, Y>(
        compose(deeperFocus, focusState),
        compose(embedAction, deeperEmbed),
      );
    },
  });

  return { subscribe, send, scope };
}

// ----------------------------------------------------------------

export function exhaustiveGuard(_value: never): never {
  throw new Error(
    `ERROR! Reached forbidden guard function with unexpected value: ${JSON.stringify(
      _value,
    )}`,
  );
}

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

// ----------------------------------------------------------------

interface Lens<S, A> {
  get(s: S): A;
  set(s: S, a: A): S;
}

interface Prism<S, A> {
  embed(a: A): S;
  extract(s: S): A | null;
}

function composeL<A, B, C>(lhs: Lens<A, B>, rhs: Lens<B, C>): Lens<A, C> {
  return {
    get: (a) => rhs.get(lhs.get(a)),
    set: (a, c) => lhs.set(a, rhs.set(lhs.get(a), c)),
  };
}

// ----------------------------------------------------------------

type CounterAction = 'increment' | 'decrement' | 'reset';

interface CounterEnv {
  announce: Effect<never>;
}

const counterReducer: Reducer<number, CounterAction, CounterEnv> = {
  reduce: (state, action, env) => {
    const none = Effect.empty<CounterAction>();
    const announce = castNever<CounterAction>(env.announce);

    switch (action) {
      case 'increment':
        return [state + 1, none];
      case 'decrement':
        return [state - 1, none];
      case 'reset':
        return [0, announce];
      default:
        return exhaustiveGuard(action);
    }
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ex2() {
  const liveEnv: CounterEnv = {
    announce: logEffect('RESET'),
  };

  const logCounterReducer = loggingReducer(counterReducer, logEffect);

  const store2 = makeStore(0, liveEnv, logCounterReducer);
  const unsub2 = store2.subscribe((s) => console.log('sub: ' + s));
  store2.send('increment');
  store2.send('decrement');
  store2.send('reset');
  unsub2();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ex3() {
  type State = [number, number];

  interface LeftAction {
    type: 'LeftAction';
    value: CounterAction;
  }

  interface RightAction {
    type: 'RightAction';
    value: CounterAction;
  }

  type Action = LeftAction | RightAction;

  interface AppEnv {
    announce1: Effect<never>;
    announce2: Effect<never>;
  }

  const liveEnv: AppEnv = {
    announce1: logEffect('RESET1'),
    announce2: logEffect('RESET2'),
  };

  const firstL: Lens<State, number> = {
    get: (s) => s[0],
    set: (s, n) => [n, s[1]],
  };

  const firstP: Prism<Action, CounterAction> = {
    embed: (x) => {
      return { type: 'LeftAction', value: x };
    },
    extract: (x) => {
      if (x.type !== 'LeftAction') {
        return null;
      }
      return x.value;
    },
  };

  const secondL: Lens<State, number> = {
    get: (s) => s[1],
    set: (s, n) => [s[0], n],
  };

  const secondP: Prism<Action, CounterAction> = {
    embed: (x) => {
      return { type: 'RightAction', value: x };
    },
    extract: (x) => {
      if (x.type !== 'RightAction') {
        return null;
      }
      return x.value;
    },
  };

  const left: Reducer<State, Action, AppEnv> = pullback(
    counterReducer,
    firstL,
    firstP,
    (x) => {
      return {
        announce: x.announce1,
      };
    },
  );

  const right: Reducer<State, Action, AppEnv> = pullback(
    counterReducer,
    secondL,
    secondP,
    (x) => {
      return {
        announce: x.announce2,
      };
    },
  );

  const r: Reducer<State, Action, AppEnv> = concatReducers(left, right);

  const store = makeStore([0, 0], liveEnv, r);
  const s1 = store.scope((x) => x[0], firstP.embed);
  const s2 = store.scope((x) => x[1], secondP.embed);
  const unsub = store.subscribe((s) => console.log(s));
  const unsub1 = s1.subscribe((s) => console.log('1: ' + s));
  const unsub2 = s2.subscribe((s) => console.log('2: ' + s));
  store.send(firstP.embed('increment'));
  store.send(firstP.embed('decrement'));
  store.send(firstP.embed('increment'));
  store.send(firstP.embed('increment'));
  store.send(firstP.embed('reset'));
  store.send(secondP.embed('increment'));
  store.send(secondP.embed('decrement'));
  store.send(secondP.embed('increment'));
  store.send(secondP.embed('increment'));
  store.send(secondP.embed('reset'));
  unsub();
  unsub1();
  unsub2();
}

export {
  Effect,
  makeStore,
  pullback,
  concatReducers,
  loggingReducer,
  compose,
  composeL,
  castNever,
};

export type { Reducer, Lens, Prism, Store };
