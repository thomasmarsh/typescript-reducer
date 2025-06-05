/* eslint-disable @typescript-eslint/no-unused-vars */
import { CounterAction, CounterEnv, counterReducer } from './counter';
import { makeTestStore, TestStore, Effect, send } from '../core/framework';

describe('counterReducer', () => {
  let announceCount = 0;
  const env: CounterEnv = {
    announce: new Effect((_) => {
      announceCount++;
    }),
  };
  let testStore: TestStore<number, CounterAction>;

  beforeEach(() => {
    announceCount = 0;
    testStore = makeTestStore(0, env, counterReducer);
  });

  it('should increment', () => {
    expect(function () {
      testStore.assert(send('increment', (x) => 1));
    }).not.toThrow();
  });

  it('should decrement', () => {
    expect(function () {
      testStore.assert(
        send('increment', (x) => 1),
        send('decrement', (x) => 0),
      );
    }).not.toThrow();
  });

  it('should announce reset', () => {
    expect(announceCount).toBe(0);
    expect(function () {
      testStore.assert(send('reset', (x) => 0));
    }).not.toThrow();
    expect(announceCount).toBe(1);
  });

  it('should reset', () => {
    expect(function () {
      testStore.assert(
        send('increment', (x) => 1),
        send('increment', (x) => 2),
        send('increment', (x) => 3),
        send('reset', (x) => 0),
      );
    }).not.toThrow();
  });

  it('should not go below zero', () => {
    expect(function () {
      testStore.assert(
        send('increment', (x) => 1),
        send('increment', (x) => 2),
        send('decrement', (x) => 1),
        send('decrement', (x) => 0),
        // Additional decrement shouldn't change value
        send('decrement', (x) => 0),
      );
    }).not.toThrow();
  });
});
