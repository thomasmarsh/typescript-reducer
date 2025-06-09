import { CatAction, CatEnv, catReducer, CatState, initCatState } from './cats';
import { CounterAction, CounterEnv, counterReducer } from './counter';
import { concatReducers, Effect, pullback } from '../core/framework';
import { composeL, Lens, lensFor, Prism } from '../core/optics';
import { deepClone } from 'app/core/util';

interface AppData {
  leftCounter: number;
  rightCounter: number;
  cats: CatState;
}

interface TraceEntry {
  action: AppAction;
  state: AppData;
}

interface AppHistory {
  initialState: AppData;
  trace: TraceEntry[];
}

interface AppState {
  state: AppData;
  history: AppHistory;
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

const dataLens: Lens<AppState, AppData> = lensFor('state');
const leftLens: Lens<AppState, number> = composeL(
  dataLens,
  lensFor('leftCounter'),
);
const rightLens: Lens<AppState, number> = composeL(
  dataLens,
  lensFor('rightCounter'),
);
const catLens: Lens<AppState, CatState> = composeL(dataLens, lensFor('cats'));

const leftPrism: Prism<AppAction, CounterAction> = {
  extract: (a) => (a.tag === 'LeftAction' ? a.value : null),
  embed: (v) => ({ tag: 'LeftAction', value: v }),
};

const rightPrism: Prism<AppAction, CounterAction> = {
  extract: (a) => (a.tag === 'RightAction' ? a.value : null),
  embed: (v) => ({ tag: 'RightAction', value: v }),
};

const catPrism: Prism<AppAction, CatAction> = {
  extract: (a) => (a.tag === 'CatAction' ? a.value : null),
  embed: (v) => ({ tag: 'CatAction', value: v }),
};

function updateHistory(state: AppState, action: AppAction): AppState {
  const newState = deepClone(state);
  newState.history.trace.push({ state: state.state, action });
  return newState;
}

export function initialAppState(): AppState {
  const initialData: AppData = {
    leftCounter: 0,
    rightCounter: 0,
    cats: initCatState,
  };

  return {
    state: initialData,
    history: {
      initialState: initialData,
      trace: [],
    },
  };
}

const appReducer = concatReducers(
  pullback(counterReducer, leftLens, leftPrism, (env: AppEnv) => env.left),
  pullback(counterReducer, rightLens, rightPrism, (env: AppEnv) => env.right),
  pullback(catReducer, catLens, catPrism, (env: AppEnv) => env.cat),
  {
    reduce: (state, action) => {
      const none = Effect.empty<AppAction>();
      if (action.tag === 'LeftAction') {
        return [
          updateHistory(state, action),
          Effect.pure(
            catPrism.embed({
              tag: 'FetchCats',
              count: state.state.leftCounter,
            }),
          ),
        ];
      }
      return [updateHistory(state, action), none];
    },
  },
);

export type { AppAction, AppState, AppEnv };
export {
  appReducer,
  leftPrism,
  rightPrism,
  catPrism,
  type AppData,
  type AppHistory,
};
