import { Reducer, Effect, castNever, exhaustiveGuard } from './framework';

export type CounterAction = 'increment' | 'decrement' | 'reset';

export interface CounterEnv {
  announce: Effect<never>;
}

export const counterReducer: Reducer<number, CounterAction, CounterEnv> = {
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
        exhaustiveGuard(action);
    }
  },
};
