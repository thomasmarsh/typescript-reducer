export interface Lens<S, A> {
  get(s: S): A;
  set(s: S, a: A): S;
}

export function lensFor<S, K extends keyof S>(key: K): Lens<S, S[K]> {
  return {
    get: (s) => s[key],
    set: (s, a) => ({ ...s, [key]: a }),
  };
}

export function composeL<A, B, C>(
  lhs: Lens<A, B>,
  rhs: Lens<B, C>,
): Lens<A, C> {
  return {
    get: (a) => rhs.get(lhs.get(a)),
    set: (a, c) => lhs.set(a, rhs.set(lhs.get(a), c)),
  };
}

export interface Prism<S, A> {
  embed(a: A): S;
  extract(s: S): A | null;
}
