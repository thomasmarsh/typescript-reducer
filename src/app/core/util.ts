// (b -> c) -> (a -> b) -> (a -> c)
export const compose =
  <A, B, C>(f: (b: B) => C, g: (a: A) => B) =>
  (a: A): C =>
    f(g(a));

export function absurd<A>(_value: never): A {
  throw new Error(
    `ERROR! Reached forbidden function with unexpected value: ${JSON.stringify(
      _value,
    )}`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function exhaustiveGuard(_value: never): never {
  throw new Error(
    `ERROR! Reached forbidden guard function with unexpected value: ${JSON.stringify(
      _value,
    )}`,
  );
}
