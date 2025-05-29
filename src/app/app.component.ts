import { Component, inject } from '@angular/core';
import { makeStore, Store, loggingReducer } from './core/framework';
import { CounterAction } from './core/counter';
import { CatAction, CatState, initCatState } from './core/cats';
import { CounterComponent } from './counter/counter.component';
import { CatsComponent } from './cats/cats.component';
import { HttpClient } from '@angular/common/http';
import {
  AppAction,
  AppEnv,
  appReducer,
  AppState,
  catPrism,
  leftPrism,
  rightPrism,
} from './core/app';
import { httpFetch } from './core/effect/http';
import { logEffect } from './core/effect/log';

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
  store!: Store<AppState, AppAction>;
  store1!: Store<number, CounterAction>;
  store2!: Store<number, CounterAction>;
  store3!: Store<CatState, CatAction>;

  constructor() {
    // Top-level environment instantiated here
    const env: AppEnv = {
      left: { announce: logEffect('Left RESET') },
      right: { announce: logEffect('Right RESET') },
      cat: { httpFetch: httpFetch(inject(HttpClient)) },
    };

    // Top-level store instantiated here
    this.store = makeStore<AppState, AppAction, AppEnv>(
      { leftCounter: 0, rightCounter: 0, cats: initCatState },
      env,
      loggingReducer(appReducer, logEffect)
    );

    this.store1 = this.store.scope((s) => s.leftCounter, leftPrism.embed);
    this.store2 = this.store.scope((s) => s.rightCounter, rightPrism.embed);
    this.store3 = this.store.scope((s) => s.cats, catPrism.embed);
  }
}
