import { CatAction, CatEnv, catReducer, CatState } from './cats';
import { CounterAction, CounterEnv, counterReducer } from './counter';
import { concatReducers, Effect, Lens, Prism, pullback } from './framework';

interface AppState {
  leftCounter: number;
  rightCounter: number;
  cats: CatState;
}

type AppAction =
  | { tag: 'LeftAction'; value: CounterAction }
  | { tag: 'RightAction'; value: CounterAction }
  | { tag: 'CatAction'; value: CatAction };

interface AppEnv {
  left: CounterEnv;
  right: CounterEnv;
  cat: CatEnv;
}

const leftLens: Lens<AppState, number> = {
  get: (s) => s.leftCounter,
  set: (s, v) => ({ ...s, leftCounter: v }),
};

const rightLens: Lens<AppState, number> = {
  get: (s) => s.rightCounter,
  set: (s, v) => ({ ...s, rightCounter: v }),
};

const leftPrism: Prism<AppAction, CounterAction> = {
  extract: (a) => (a.tag === 'LeftAction' ? a.value : null),
  embed: (v) => ({ tag: 'LeftAction', value: v }),
};

const rightPrism: Prism<AppAction, CounterAction> = {
  extract: (a) => (a.tag === 'RightAction' ? a.value : null),
  embed: (v) => ({ tag: 'RightAction', value: v }),
};

const catLens: Lens<AppState, CatState> = {
  get: (s) => s.cats,
  set: (s, v) => ({ ...s, cats: v }),
};

const catPrism: Prism<AppAction, CatAction> = {
  extract: (a) => (a.tag === 'CatAction' ? a.value : null),
  embed: (v) => ({ tag: 'CatAction', value: v }),
};

const appReducer = concatReducers(
  pullback(counterReducer, leftLens, leftPrism, (env: AppEnv) => env.left),
  pullback(counterReducer, rightLens, rightPrism, (env: AppEnv) => env.right),
  pullback(catReducer, catLens, catPrism, (env: AppEnv) => env.cat),
  {
    reduce: (state, action) => {
      const none = Effect.empty<AppAction>();
      if (action.tag === 'LeftAction') {
        return [
          state,
          Effect.pure(
            catPrism.embed({ tag: 'FetchCats', count: state.leftCounter }),
          ),
        ];
      }
      return [state, none];
    },
  },
);

export type { AppAction, AppState, AppEnv };
export { appReducer, leftPrism, rightPrism, catPrism };
