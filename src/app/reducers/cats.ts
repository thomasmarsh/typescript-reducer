import { Effect, Reducer } from '../core/framework';
import { environment } from '../../environments/environment';
import { HttpFetchEffect } from '../core/effects/http';
import { exhaustiveGuard } from '../core/util';

export type CatState =
  | { tag: 'Empty' }
  | { tag: 'Loading' }
  | { tag: 'Loaded'; images: string[] }
  | { tag: 'Error'; error: string };

export type CatAction =
  | { tag: 'FetchCats'; count: number }
  | { tag: 'CatsFetched'; urls: string[] }
  | { tag: 'CatsFetchFailed'; error: string };

export const initCatState: CatState = { tag: 'Empty' };

export interface CatSearchUrl {
  url: string;
}

export interface CatEnv {
  httpFetch: HttpFetchEffect<CatSearchUrl[]>;
}

export const catReducer: Reducer<CatState, CatAction, CatEnv> = {
  reduce: (state, action, env) => {
    const none = Effect.empty<CatAction>();
    switch (action.tag) {
      // ----------------------------------------------------------------------

      case 'FetchCats': {
        if (action.count < 1) {
          return [{ tag: 'Empty' }, none];
        }

        if (environment.apiKey === '') {
          return [{tag: 'Error', error: 'missing API key' }, none]
        }

        const url = `${environment.apiUrl}/v1/images/search?limit=${action.count}`;
        const headers = { 'x-api-key': environment.apiKey };

        const fetch = env.httpFetch(url, headers).map((result) =>
          result
            .map((imageList) => imageList.map((imageEntry) => imageEntry.url))
            .either<CatAction>(
              (urls) => ({ tag: 'CatsFetched', urls }),
              (error) => ({ tag: 'CatsFetchFailed', error }),
            ),
        );

        return [{ tag: 'Loading' }, fetch];
      }

      // ----------------------------------------------------------------------

      case 'CatsFetched':
        return [
          {
            tag: 'Loaded',
            images: action.urls,
          },
          none,
        ];

      // ----------------------------------------------------------------------

      case 'CatsFetchFailed':
        return [{ ...state, tag: 'Error', error: action.error }, none];

      // ----------------------------------------------------------------------

      default:
        exhaustiveGuard(action);
    }
  },
};
