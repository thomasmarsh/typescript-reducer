export type ResultValue<T, Err> =
  | { tag: 'Ok'; value: T }
  | { tag: 'Err'; error: Err };

export class Result<T, Err> {
  value: ResultValue<T, Err>;

  constructor(value: ResultValue<T, Err>) {
    this.value = value;
  }

  map<U>(f: (t: T) => U): Result<U, Err> {
    if (this.value.tag === 'Ok') {
      return Ok(f(this.value.value));
    }
    return Err(this.value.error);
  }

  either<X>(f: (t: T) => X, g: (e: Err) => X): X {
    if (this.value.tag === 'Ok') {
      return f(this.value.value);
    }
    return g(this.value.error);
  }
}

export function Ok<T, Err = never>(value: T): Result<T, Err> {
  return new Result({ tag: 'Ok', value });
}

export function Err<Err, T = never>(error: Err): Result<T, Err> {
  return new Result({ tag: 'Err', error });
}
