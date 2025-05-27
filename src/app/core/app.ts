import { CatAction, CatEnv, catReducer, CatState } from './cats';
import { CounterAction, CounterEnv, counterReducer } from './counter';
import { concatReducers, Effect, Lens, Prism, pullback } from './framework';

type AppState = [number, number, CatState];

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
  get: (s) => s[0],
  set: (s, v) => [v, s[1], { ...s[2], count: v }],
};

const rightLens: Lens<AppState, number> = {
  get: (s) => s[1],
  set: (s, v) => [s[0], v, s[2]],
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
  get: (s) => s[2],
  set: (s, v) => [s[0], s[1], v],
};

const catPrism: Prism<AppAction, CatAction> = {
  extract: (a) => (a.tag === 'CatAction' ? a.value : null),
  embed: (v) => ({ tag: 'CatAction', value: v }),
};

const appReducer = concatReducers(
{ reduce: (state, action, env) => {
   const none  = Effect.empty<AppAction>();
   if (action.tag == 'LeftAction') {
    return [state, Effect.pure(catPrism.embed({tag: 'FetchCats'}))]
   }
   return [state, none]
}},
  pullback(counterReducer, leftLens, leftPrism, (env: AppEnv) => env.left),
  pullback(counterReducer, rightLens, rightPrism, (env: AppEnv) => env.right),
  pullback(catReducer, catLens, catPrism, (env: AppEnv) => env.cat)
);

export type { AppAction, AppState, AppEnv };
export { appReducer, leftPrism, rightPrism, catPrism};