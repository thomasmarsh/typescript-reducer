import { Component, inject } from '@angular/core';
import { makeStore, Effect, Store } from './core/framework';
import { CounterAction } from './core/counter';
import { CatAction, CatState, createCatEnv, initCatState } from './core/cats';
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
      left: { announce: new Effect((_cb) => console.log('Left RESET')) },
      right: { announce: new Effect((_cb) => console.log('Right RESET')) },
      cat: createCatEnv(inject(HttpClient)),
    };

    // Top-level store instantiated here
    this.store = makeStore<AppState, AppAction, AppEnv>(
      [0, 0, initCatState],
      env,
      appReducer
    );

    this.store1 = this.store.scope((s) => s[0], leftPrism.embed);
    this.store2 = this.store.scope((s) => s[1], rightPrism.embed);
    this.store3 = this.store.scope((s) => s[2], catPrism.embed);
  }
}
