/* eslint-disable @typescript-eslint/no-unused-vars */
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';
import { Effect, makeStore } from '../../core/framework';
import {
  AppAction,
  AppEnv,
  appReducer,
  AppState,
  catPrism,
  leftPrism,
  rightPrism,
} from '../../reducers/app';
import { initCatState } from '../../reducers/cats';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const env: AppEnv = {
      left: { announce: Effect.empty() },
      right: { announce: Effect.empty() },
      cat: {
        httpFetch: (url, headers) =>
          new Effect((cb) => {
            /* no-op */
          }),
      },
    };

    // Top-level store instantiated here
    const store = makeStore<AppState, AppAction, AppEnv>(
      { leftCounter: 0, rightCounter: 0, cats: initCatState },
      env,
      appReducer,
    );

    const store1 = store.scope((s) => s.leftCounter, leftPrism.embed);
    const store2 = store.scope((s) => s.rightCounter, rightPrism.embed);
    const store3 = store.scope((s) => s.cats, catPrism.embed);

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.store = store;
    app.store1 = store1;
    app.store2 = store2;
    app.store3 = store3;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Two Counters');
  });
});
