import { HttpClient } from '@angular/common/http';
import { Effect, exhaustiveGuard, Reducer } from './framework';
import { Result, Ok, Err } from './result';

export type CatState =
  | { tag: 'Loading'; count: number }
  | { tag: 'Loaded'; count: number; images: string[] }
  | { tag: 'Error'; count: number; error: string };

export type CatAction =
  | { tag: 'FetchCats' }
  | { tag: 'CatsFetched'; urls: string[] }
  | { tag: 'CatsFetchFailed'; error: string };

export const initState = { tag: 'Loaded', images: [] };

export interface CatEnv {
  fetchCatUrls: (count: number) => Effect<Result<string[], string>>;
}

// TODO: pass API_KEY from environment.ts --define param
const API_KEY = 'PLACE_KEY_HERE'

export function createCatEnv(http: HttpClient): CatEnv {
  return {
    fetchCatUrls: (count: number) => {
      if (count < 1) {
        return Effect.empty();
      } else {
        return new Effect<Result<string[], string>>((cb) => {
          const url = `https://api.thecatapi.com/v1/images/search?limit=${count}`;
          http
            .get<{ url: string }[]>(url, {
              headers: { 'x-api-key': API_KEY },
            })
            .subscribe({
              next: (response) => {
                console.log('response', response);
                const urls = response.map((r) => r.url);
                cb(Ok(urls));
              },
              error: (e) => {
                console.log('err', e);
                cb(Err(e?.message ?? 'Unknown error'));
              },
            });
        });
      }
    },
  };
}

function fetchResultToAction(result: Result<string[], string>): CatAction {
  switch (result.tag) {
    case 'Ok':
      return { tag: 'CatsFetched', urls: result.value };
    case 'Err':
      return { tag: 'CatsFetchFailed', error: result.error };
    default:
      exhaustiveGuard(result);
  }
}

export const catReducer: Reducer<CatState, CatAction, CatEnv> = {
  reduce: (state, action, env) => {
    const none = Effect.empty<CatAction>();
    console.log(state, action);
    switch (action.tag) {
      case 'FetchCats':
        return [
          { tag: 'Loading', count: state.count },
          env.fetchCatUrls(state.count).map((x) => {
            console.log('bbb', x);
            return fetchResultToAction(x);
          }),
        ];

      case 'CatsFetched':
        return [
          { tag: 'Loaded', count: state.count, images: action.urls },
          none,
        ];

      case 'CatsFetchFailed':
        return [
          { tag: 'Error', count: state.count, error: action.error },
          none,
        ];

      default:
        exhaustiveGuard(action);
    }
  },
};
