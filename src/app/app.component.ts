import { Component, inject } from '@angular/core';
import {
  makeStore,
  Lens,
  Prism,
  pullback,
  Effect,
  concatReducers,
  Store,
} from './core/framework';
import { counterReducer, CounterAction, CounterEnv } from './core/counter';
import {
  catReducer,
  CatAction,
  CatState,
  CatEnv,
  createCatEnv,
} from './core/cats';
import { CounterComponent } from './counter/counter.component';
import { CatsComponent } from './cats/cats.component';
import { HttpClient } from '@angular/common/http';

type AppState = [number, number, CatState];

type Action =
  | { type: 'LeftAction'; value: CounterAction }
  | { type: 'RightAction'; value: CounterAction }
  | { type: 'CatAction'; value: CatAction };

interface Env {
  left: CounterEnv;
  right: CounterEnv;
  cat: CatEnv;
}

@Component({
  imports: [CounterComponent, CatsComponent],
  selector: 'app-root',
  template: `
    <h1>Two Counters</h1>

    <div style="display: flex; flex-grow: grow; gap: 20px">
      <app-counter [store]="store1" />
      <app-counter [store]="store2" />
    </div>
    <app-cats [store]="store3" />
  `,
})
export class AppComponent {
  store!: Store<AppState, Action>;
  store1!: Store<number, CounterAction>;
  store2!: Store<number, CounterAction>;
  store3!: Store<CatState, CatAction>;

  constructor() {
    const leftLens: Lens<AppState, number> = {
      get: (s) => s[0],
      set: (s, v) => [v, s[1], { ...s[2], count: v}],
    };

    const rightLens: Lens<AppState, number> = {
      get: (s) => s[1],
      set: (s, v) => [s[0], v, s[2]],
    };

    const leftPrism: Prism<Action, CounterAction> = {
      extract: (a) => (a.type === 'LeftAction' ? a.value : null),
      embed: (v) => ({ type: 'LeftAction', value: v }),
    };

    const rightPrism: Prism<Action, CounterAction> = {
      extract: (a) => (a.type === 'RightAction' ? a.value : null),
      embed: (v) => ({ type: 'RightAction', value: v }),
    };

    const catLens: Lens<AppState, CatState> = {
      get: (s) => s[2],
      set: (s, v) => [s[0], s[1], v],
    };

    const catPrism: Prism<Action, CatAction> = {
      extract: (a) => (a.type === 'CatAction' ? a.value : null),
      embed: (v) => ({ type: 'CatAction', value: v }),
    };

    const reducer = concatReducers(
      {
        reduce: (state, action, env) => {
          if (action.type === 'LeftAction') {
            return [state, Effect.pure(catPrism.embed({ tag: 'FetchCats'}))]
          }
          return [state, Effect.empty<Action>()]
        }
      },
      pullback(counterReducer, leftLens, leftPrism, (env: Env) => env.left),
      pullback(counterReducer, rightLens, rightPrism, (env: Env) => env.right),
      pullback(catReducer, catLens, catPrism, (env: Env) => env.cat),
    );

    const env: Env = {
      left: { announce: new Effect((_cb) => console.log('Left RESET')) },
      right: { announce: new Effect((_cb) => console.log('Right RESET')) },
      cat: createCatEnv(inject(HttpClient)),
    };

    this.store = makeStore<AppState, Action, Env>(
      [0, 0, { tag: 'Loading', count: 0 }],
      env,
      reducer
    );
    this.store1 = this.store.zoom((s) => s[0], leftPrism.embed);
    this.store2 = this.store.zoom((s) => s[1], rightPrism.embed);
    this.store3 = this.store.zoom((s) => s[2], catPrism.embed)
  }
}
