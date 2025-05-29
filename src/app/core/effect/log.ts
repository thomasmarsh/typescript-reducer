import { Effect } from '../framework';

export const logEffect: (s: string) => Effect<never> = (s) =>
  Effect.void(() => {
    console.log(s);
  });
