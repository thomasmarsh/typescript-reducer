import {
  catReducer,
  CatSearchUrl,
  initCatState,
} from './cats';
import { Effect } from './framework';
import { Err, Ok, Result } from './result';
import { makeTestStore, TestStoreStep } from './test_store';

function send<S, A>(action: A, update: (s: S) => S): TestStoreStep<S, A> {
  return { tag: 'send', action, update };
}

function receive<S, A>(action: A, update: (s: S) => S): TestStoreStep<S, A> {
  return { tag: 'receive', action, update };
}

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

  it('should receive urls', () => {
    const testStore = makeTestStore(
      initCatState,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      { httpFetch: (_url, _headers) => successEffect },
      catReducer,
    );
    expect(function () {
      testStore.assert(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        send({ tag: 'FetchCats', count: 10 }, (_state) => ({ tag: 'Loading' })),
        receive(
          { tag: 'CatsFetched', urls: catUrls.map((x) => x.url) },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      { httpFetch: (_url, _headers) => failureEffect },
      catReducer,
    );
    expect(function () {
      testStore.assert(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        send({ tag: 'FetchCats', count: 10 }, (_state) => ({ tag: 'Loading' })),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        receive({ tag: 'CatsFetchFailed', error: 'failure' }, (_state) => ({
          tag: 'Error',
          error: 'failure',
        })),
      );
    }).not.toThrow();
  });
});
