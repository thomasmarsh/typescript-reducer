// (b -> c) -> (a -> b) -> (a -> c)
export const compose =
  <A, B, C>(f: (b: B) => C, g: (a: A) => B) =>
  (a: A): C =>
    f(g(a));

export function exhaustiveGuard(value: never): never {
  return absurd<never>(value);
}

export function absurd<A>(_value: never): A {
  throw new Error(
    `ERROR! Reached forbidden function with unexpected value: ${JSON.stringify(
      _value,
    )}`,
  );
}

export function deepClone<A>(a: A): A {
  return JSON.parse(JSON.stringify(a));
}

export function deepEqual<A>(a: A, b: A): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
