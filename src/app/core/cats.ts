import { HttpClient } from '@angular/common/http';
import { Effect, exhaustiveGuard, Reducer } from './framework';
import { Result, Ok, Err } from './result';

import { environment } from '../../environments/environment';

// NOTE: normalization (i.e., eliminating `number` from unneeded cases) introduces AffineLens...
export type CatState =
  | { tag: 'Empty'; count: number }
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

export function createCatEnv(http: HttpClient): CatEnv {
  return {
    fetchCatUrls: (count: number) => {
      if (count < 1) {
        throw new Error("logic error")
      } else {
        return new Effect<Result<string[], string>>((cb) => {
          const url = `${environment.apiUrl}/v1/images/search?limit=${count}`;
          http
            .get<{ url: string }[]>(url, {
              headers: { 'x-api-key': environment.apiKey },
            })
            .subscribe({
              next: (response) => {
                const urls = response.map((r) => r.url);
                cb(Ok(urls));
              },
              error: (e) => {
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
    console.log(state);
    const none = Effect.empty<CatAction>();
    switch (action.tag) {
      case 'FetchCats':
        if (state.count < 1) {
          return [{ tag: 'Empty', count: state.count }, none];
        }
        return [
          { tag: 'Loading', count: state.count },
          env.fetchCatUrls(state.count).map((x) => {
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
