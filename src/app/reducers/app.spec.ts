/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppAction, AppEnv, appReducer, AppState } from './app';
import { makeTestStore, TestStore, Effect } from '../core/framework';
import { CatSearchUrl, initCatState } from './cats';
import { Err, Ok, Result } from 'app/core/result';

import successSnapshot from './fixtures/app-success.json';
import failureSnapshot from './fixtures/app-fail.json';

type Snapshot = { state: AppState; action?: AppAction }[];

describe('appReducer', () => {
  const catUrls = [
    { url: 'http://a' },
    { url: 'http://b' },
    { url: 'http://c' },
  ];

  const catUrlResult: Result<CatSearchUrl[], string> = Ok(catUrls);
  const catError: Result<CatSearchUrl[], string> = Err('failure');

  type SearchEffect = Effect<Result<CatSearchUrl[], string>>;
  const successEffect: SearchEffect = Effect.pure(catUrlResult);
  const failureEffect: SearchEffect = Effect.pure(catError);

  function mkEnv(eff: Effect<Result<CatSearchUrl[], string>>): AppEnv {
    return {
      left: { announce: Effect.empty() },
      right: { announce: Effect.empty() },
      cat: { httpFetch: (_url, _headers) => eff },
    };
  }

  function mkStore(
    eff: Effect<Result<CatSearchUrl[], string>>,
  ): TestStore<AppState, AppAction> {
    return makeTestStore(
      { leftCounter: 0, rightCounter: 0, cats: initCatState },
      mkEnv(eff),
      appReducer,
    );
  }

  const incrLeft: AppAction = {
    tag: 'LeftAction',
    value: 'increment',
  };

  const fetch: AppAction = {
    tag: 'CatAction',
    value: { tag: 'FetchCats', count: 3 },
  };

  it('should match success snapshot', () => {
    const store = mkStore(successEffect);
    expect(() => {
      store.send(incrLeft);
      store.send(fetch);
      store.assertSnapshot(successSnapshot as Snapshot);
    }).not.toThrow();
  });

  it('should match failure snapshot', () => {
    const store = mkStore(failureEffect);
    expect(() => {
      store.send(incrLeft);
      store.send(fetch);
      store.assertSnapshot(failureSnapshot as Snapshot);
    }).not.toThrow();
  });
});
