import { Component, inject } from '@angular/core';
import { makeStore, Store, loggingReducer } from '../../core/framework';
import { CounterAction } from '../../reducers/counter';
import { CatAction, CatState, initCatState } from '../../reducers/cats';
import { CounterComponent } from '../counter/counter.component';
import { CatsComponent } from '../cats/cats.component';
import { HttpClient } from '@angular/common/http';
import {
  AppAction,
  AppData,
  AppEnv,
  AppHistory,
  appReducer,
  AppState,
  catPrism,
  leftPrism,
  rightPrism,
} from '../../reducers/app';
import { httpFetch } from '../../core/effects/http';
import { logEffect } from '../../core/effects/log';
import { absurd } from 'app/core/util';
import { HistoryComponent } from '../history/history.component';

@Component({
  imports: [CounterComponent, CatsComponent, HistoryComponent],
  selector: 'app-root',
  template: `
    <h1>Two Counters</h1>

    <div style="display: flex; flex-grow: grow; gap: 20px">
      <app-counter [store]="store1" />
      <app-counter [store]="store2" />
    </div>
    <app-cats [store]="store3" />
    <app-history [store]="store4" />
  `,
})
export class AppComponent {
  store!: Store<AppState, AppAction>;
  store1!: Store<number, CounterAction>;
  store2!: Store<number, CounterAction>;
  store3!: Store<CatState, CatAction>;
  store4!: Store<AppHistory, never>;

  constructor() {
    // Top-level environment instantiated here
    const env: AppEnv = {
      left: { announce: logEffect('Left RESET') },
      right: { announce: logEffect('Right RESET') },
      cat: { httpFetch: httpFetch(inject(HttpClient)) },
    };

    const initialData: AppData = {
      leftCounter: 0,
      rightCounter: 0,
      cats: initCatState,
    };

    const initialState: AppState = {
      state: initialData,
      history: {
        initialState: initialData,
        trace: [],
      },
    };

    // Top-level store instantiated here
    this.store = makeStore<AppState, AppAction, AppEnv>(
      initialState,
      env,
      loggingReducer(appReducer, logEffect),
    );

    this.store1 = this.store.scope((s) => s.state.leftCounter, leftPrism.embed);
    this.store2 = this.store.scope(
      (s) => s.state.rightCounter,
      rightPrism.embed,
    );
    this.store3 = this.store.scope((s) => s.state.cats, catPrism.embed);
    this.store4 = this.store.scope(
      (s) => s.history,
      (x) => absurd<AppAction>(x),
    );
  }
}
