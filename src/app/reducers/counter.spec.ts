/* eslint-disable @typescript-eslint/no-unused-vars */
import { CounterAction, CounterEnv, counterReducer } from './counter';
import { makeTestStore, TestStore, Effect, send } from '../core/framework';

import counterSnapshot from './fixtures/counter.json';

describe('counterReducer', () => {
  let announceCount = 0;
  const env: CounterEnv = {
    announce: new Effect((_) => {
      announceCount++;
    }),
  };
  let store: TestStore<number, CounterAction>;

  beforeEach(() => {
    announceCount = 0;
    store = makeTestStore(0, env, counterReducer);
  });

  it('should increment', () => {
    expect(() => {
      store.assert(send('increment', (x) => 1));
    }).not.toThrow();
  });

  it('should decrement', () => {
    expect(() => {
      store.assert(
        send('increment', (x) => 1),
        send('decrement', (x) => 0),
      );
    }).not.toThrow();
  });

  it('should announce reset', () => {
    expect(announceCount).toBe(0);
    expect(() => {
      store.assert(send('reset', (x) => 0));
    }).not.toThrow();
    expect(announceCount).toBe(1);
  });

  it('should reset', () => {
    expect(() => {
      store.assert(
        send('increment', (x) => 1),
        send('increment', (x) => 2),
        send('increment', (x) => 3),
        send('reset', (x) => 0),
      );
    }).not.toThrow();
  });

  it('should not go below zero', () => {
    expect(() => {
      store.assert(
        send('increment', (x) => 1),
        send('increment', (x) => 2),
        send('decrement', (x) => 1),
        send('decrement', (x) => 0),
        // Additional decrement shouldn't change value
        send('decrement', (x) => 0),
      );
    }).not.toThrow();
  });

  it('should match snapshot', () => {
    expect(() => {
      store.send('increment');
      store.send('increment');
      store.send('increment');
      store.send('increment');
      store.send('decrement');
      store.send('decrement');
      store.send('decrement');
      store.send('increment');
      store.send('reset');

      store.send('decrement');
      store.send('increment');
      store.send('decrement');
      store.send('increment');
      store.assertSnapshot(
        counterSnapshot as { state: number; action?: CounterAction }[],
      );
    }).not.toThrow();
  });
});
