import { HttpClient } from '@angular/common/http';
import { Effect } from '../framework';
import { Err, Ok, Result } from '../result';

/**
 * This is a simplified HTTP request `Effect` type. It takes two parameters,
 * but is not as comprehensive as the `HttpClient` methods. A more thorough
 * wrapper would need to mimic the `HttpClient` API more closely.
 *
 * @param url
 * @param headers
 */
export type HttpFetchEffect<A> = (
  url: string,
  headers: Record<string, string | string[]>
) => Effect<Result<A, string>>;

/**
 * This function turns a HttpClient.get request in to an HttpFetchEffect,
 * hiding the implementation details of the HttpClient.
 *
 * @param http
 * @returns HttpFetchEffect<A>
 */
export function httpFetch<A>(http: HttpClient): HttpFetchEffect<A> {
  return (url, headers) =>
    new Effect((callback) =>
      http.get<A>(url, { headers }).subscribe({
        next: (response) => callback(Ok(response)),
        error: (e) => callback(Err(e?.message ?? 'Unknown error')),
      })
    );
}
