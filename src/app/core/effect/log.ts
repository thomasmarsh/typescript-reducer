import { Effect } from '../framework';

export const logEffect: (s: String) => Effect<never> = (s) =>
  Effect.void(() => {
    console.log(s);
  });
