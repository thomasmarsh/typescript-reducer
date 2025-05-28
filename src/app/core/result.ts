export type Result<T, Err> =
  | { tag: 'Ok'; value: T }
  | { tag: 'Err'; error: Err };

export function Ok<T, Err = never>(value: T): Result<T, Err> {
  return { tag: 'Ok', value };
}

export function Err<Err, T = never>(error: Err): Result<T, Err> {
  return { tag: 'Err', error };
}
