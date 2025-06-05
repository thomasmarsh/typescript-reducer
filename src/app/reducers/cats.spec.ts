/* eslint-disable @typescript-eslint/no-unused-vars */
import { catReducer, CatSearchUrl, initCatState } from './cats';
import { Effect, receive, send } from '../core/framework';
import { Err, Ok, Result } from '../core/result';
import { makeTestStore, TestStoreStep } from '../core/framework';

describe('catReducer', () => {
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

  it('should do nothing with < 1 count', () => {
    const testStore = makeTestStore(
      initCatState,
      { httpFetch: (_url, _headers) => successEffect },
      catReducer,
    );

    expect(function () {
      testStore.assert(
        send({ tag: 'FetchCats', count: 0 }, (_state) => ({ tag: 'Empty' })),
      );
    }).not.toThrow();
  });

  it('should receive urls', () => {
    const testStore = makeTestStore(
      initCatState,
      { httpFetch: (_url, _headers) => successEffect },
      catReducer,
    );

    expect(function () {
      testStore.assert(
        send({ tag: 'FetchCats', count: 10 }, (_state) => ({ tag: 'Loading' })),
        receive(
          { tag: 'CatsFetched', urls: catUrls.map((x) => x.url) },
          (_state) => ({
            tag: 'Loaded',
            images: ['http://a', 'http://b', 'http://c'],
          }),
        ),
      );
    }).not.toThrow();
  });

  it('should receive error', () => {
    const testStore = makeTestStore(
      initCatState,
      { httpFetch: (_url, _headers) => failureEffect },
      catReducer,
    );

    expect(function () {
      testStore.assert(
        send({ tag: 'FetchCats', count: 10 }, (_state) => ({ tag: 'Loading' })),
        receive({ tag: 'CatsFetchFailed', error: 'failure' }, (_state) => ({
          tag: 'Error',
          error: 'failure',
        })),
      );
    }).not.toThrow();
  });
});
