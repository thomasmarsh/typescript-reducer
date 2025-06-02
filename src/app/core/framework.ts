import { Observable } from 'rxjs';
import { Lens, Prism } from './optics';

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
