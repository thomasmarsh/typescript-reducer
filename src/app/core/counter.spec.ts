import { CounterAction, CounterEnv, counterReducer } from './counter';
import { Effect } from './framework';
import { makeTestStore, TestStore, TestStoreStep } from './test_store';

function send<S, A>(action: A, update: (s: S) => S): TestStoreStep<S, A> {
  return { tag: 'send', action, update };
}

describe('counterReducer', () => {
  const env: CounterEnv = { announce: Effect.empty() };
  let testStore: TestStore<number, CounterAction>;

  beforeEach(() => {
    testStore = makeTestStore(0, env, counterReducer);
  });

  it('should increment', () => {
    expect(function () {
      testStore.assert(
        send('increment', (state) => {
          return state + 1;
        }),
      );
    }).not.toThrow();
  });

  it('should reset', () => {
    expect(function () {
      testStore.assert(
        send('reset', (state) => {
          return state - state;
        }),
      );
    }).not.toThrow();
  });

  it('should not go below zero', () => {
    expect(function () {
      testStore.assert(
        send('decrement', (state) => {
          return state;
        }),
      );
    }).not.toThrow();
  });
});
