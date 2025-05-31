# TypeScript Reducer Demo

This project demonstrates a simple reducer architecture. It's purpose is not for production, but for teaching how these systems are built. It can be used as a basis to understand production systems like [NgRx](https://ngrx.io/).

The interesting areas are primarily the core:

- [framework.ts](src/app/core/framework.ts) - the core framework that provides `Reducer`, `Effect`, and `Store`
- [counter.ts](src/app/core/counter.ts) - a trivial demonstration reducer
- [cats.ts](src/app/core/cats.ts) - a reducer with a complex side-effect
- [optics.ts](src/app/core/optics.ts) - lens and prism implementations

## Running

Before you can run this, there is one piece of setup for the API service we use.

- Get an API key for the [Cat API](https://thecatapi.com/). (Follow the links and create a free account.)
- Place the key in the environment files:
  - [environment.development.ts](src/environments/environment.development.ts)
  - [environment.ts](src/environments/environment.ts)

- Now you should be able to build and `ng serve`

## Implementation Notes

This implementation suffers from the following primary deficiencies that prevent use in production:

- `Effect<A>` is not cancellable:
  - It would need to provide a `() => void` disposal function to cancel or clean-up
  - A clean-up function would enable long-running effects to be terminated
  - Such a function would also enhance support for effects that are converted to `Observable<A>` (which requires an unsubscribe) or for `Observable<A>` values that are converted to an `Effect<A>`

- `Store.send()` is implemented recursively. It should maintain a FIFO queue array of actions to process so that it doesn't accidentally blow the stack.

- There are no performance considerations. This is purely a pedagogic tool.