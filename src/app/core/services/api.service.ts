import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { ApiEndpoint } from '../constants/api-endpoints';

export type QueryParamValue = string | number | boolean;

/** Per-request options accepted by every {@link ApiService} method. */
export interface ApiRequestOptions {
  /** Values substituted into `:token` path params, e.g. `{ id }` for `/posts/:id`. */
  pathParams?: Record<string, string | number>;
  /** Query string params; array values produce repeated keys. */
  params?: Record<string, QueryParamValue | QueryParamValue[]>;
  /** Extra request headers (merged with defaults). */
  headers?: Record<string, string>;
  /** Response body type. Defaults to `json` (which also unwraps the ApiResponse envelope). */
  responseType?: 'json' | 'text' | 'blob';
}

/**
 * The single HTTP gateway for the whole app. Every API call goes through here —
 * components and feature services must NEVER inject `HttpClient` directly.
 *
 * Responsibilities centralized in one place:
 *  - builds the full URL (base URL + {@link ApiEndpoint} path) and substitutes path params
 *  - appends query params and merges headers
 *  - unwraps the backend `ApiResponse<T>` envelope so callers get `T` directly
 *
 * Cross-cutting concerns that apply to *every* request (auth token, global error
 * normalization) live in the HTTP interceptors (`core/interceptors/`), not here.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(endpoint: ApiEndpoint, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  post<T>(endpoint: ApiEndpoint, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  put<T>(endpoint: ApiEndpoint, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  patch<T>(endpoint: ApiEndpoint, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  delete<T>(endpoint: ApiEndpoint, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  private request<T>(
    method: string,
    endpoint: ApiEndpoint,
    body: unknown,
    options?: ApiRequestOptions,
  ): Observable<T> {
    const url = this.buildUrl(endpoint, options?.pathParams);
    const responseType = options?.responseType ?? 'json';

    const request$: Observable<unknown> = this.http.request(method, url, {
      body,
      params: this.buildParams(options?.params),
      headers: this.buildHeaders(options?.headers),
      responseType: responseType as 'json',
      observe: 'body',
    });

    // Non-json bodies (text/blob) are returned as-is; json bodies are unwrapped.
    if (responseType !== 'json') {
      return request$ as Observable<T>;
    }
    return request$.pipe(map((res) => this.unwrap<T>(res)));
  }

  /** Base URL + endpoint path with `:token` path params substituted. */
  private buildUrl(endpoint: ApiEndpoint, pathParams?: Record<string, string | number>): string {
    let path: string = endpoint;
    if (pathParams) {
      for (const [key, value] of Object.entries(pathParams)) {
        path = path.replace(`:${key}`, encodeURIComponent(String(value)));
      }
    }
    const unresolved = path.match(/:([A-Za-z0-9_]+)/);
    if (unresolved) {
      throw new Error(`Missing path param "${unresolved[1]}" for endpoint "${endpoint}"`);
    }
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }

  private buildParams(params?: ApiRequestOptions['params']): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          continue;
        }
        if (Array.isArray(value)) {
          for (const entry of value) {
            httpParams = httpParams.append(key, String(entry));
          }
        } else {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }
    return httpParams;
  }

  private buildHeaders(headers?: Record<string, string>): HttpHeaders {
    return new HttpHeaders(headers ?? {});
  }

  /** Unwraps `{ success, data, ... }` envelopes; passes other payloads through unchanged. */
  private unwrap<T>(res: unknown): T {
    if (res !== null && typeof res === 'object' && 'success' in res && 'data' in res) {
      return (res as ApiResponse<T>).data;
    }
    return res as T;
  }
}
