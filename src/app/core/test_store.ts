import { Reducer, Store } from "./framework"

class TestAction<S,A> {
 action: A
 state: S

  constructor(state: S, action: A) {
    this.action = action
    this.state = state
  }

  map<T>(f: (s: S) => T): TestAction<T,A> {
    return new TestAction(f(this.state), this.action)
  }
}

class TestState<S,A> {
  initialState: S
  history: TestAction<S,A>[] = []

  constructor(initialState: S) {
    this.initialState = initialState
  }
}

// TODO
export function makeTestStore<S, A, R>(
  initialState: S,
  reducer: Reducer<S, A, R>,
  env: R,
): Store<S, A> {
    const state = new TestState(initialState)
    const subscribers: ((s: S) => void)[] = []

    function send(action: A) {
        const currentState = state.history[state.history.length-1].state ?? state.initialState
        const [s, eff] = reducer.reduce(currentState, action, env)
        state.history.push(new TestAction(s, action)) 
        eff.unsafeRun(send)
    }

    function subscribe(callback: (s: S) => void): () => void {
        subscribers.push(callback)
        return () => {
            /* no-op */
        }
    }

    return {
        send,
        subscribe
    }
}

