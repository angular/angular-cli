/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { ApplicationRef, Injectable } from '@angular/core';
import { StateKey, TransferState, makeStateKey } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';

type ResponseType = HttpRequest<unknown>['responseType'];

interface TransferHttpResponse {
  body?: any | null;
  headers?: Record<string, string[]>;
  status?: number;
  statusText?: string;
  url?: string;
  responseType?: ResponseType;
}

@Injectable()
export class TransferHttpCacheInterceptor implements HttpInterceptor {
  private isCacheActive = true;

  private makeCacheKey(
    method: string,
    url: string,
    params: HttpParams,
    responseType?: ResponseType,
  ): StateKey<TransferHttpResponse> {
    // make the params encoded same as a url so it's easy to identify
    const encodedParams = params
      .keys()
      .sort()
      .map((k) => `${k}=${params.getAll(k)}`)
      .join('&');

    const key = (method === 'GET' ? 'G.' : 'H.') + responseType + '.' + url + '?' + encodedParams;

    return makeStateKey(key);
  }

  constructor(appRef: ApplicationRef, private transferState: TransferState) {
    // Stop using the cache if the application has stabilized, indicating initial rendering is
    // complete.
    appRef.isStable
      .pipe(
        filter((isStable) => isStable),
        take(1),
        tap(() => (this.isCacheActive = false)),
      )
      .subscribe();
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isCacheActive || !['GET', 'HEAD'].includes(req.method)) {
      // Cache is no longer active. Pass the request through.
      return next.handle(req);
    }

    const storeKey = this.makeCacheKey(req.method, req.url, req.params, req.responseType);

    if (this.transferState.hasKey(storeKey)) {
      // Request found in cache. Respond using it.
      const response = this.transferState.get(storeKey, {});
      let body: ArrayBuffer | Blob | string | undefined = response.body;

      switch (response.responseType) {
        case 'arraybuffer':
          {
            // If we're in Node...
            if (typeof Buffer !== 'undefined') {
              const buf = Buffer.from(response.body);
              body = new ArrayBuffer(buf.length);
              const view = new Uint8Array(body);
              for (let i = 0; i < buf.length; ++i) {
                view[i] = buf[i];
              }
            } else if (typeof TextEncoder !== 'undefined') {
              // Modern browsers implement TextEncode.
              body = new TextEncoder().encode(response.body).buffer;
            }
          }
          break;
        case 'blob':
          body = new Blob([response.body]);
          break;
      }

      return of(
        new HttpResponse<any>({
          body,
          headers: new HttpHeaders(response.headers),
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        }),
      );
    }

    // Request not found in cache. Make the request and cache it.
    const httpEvent = next.handle(req);

    return httpEvent.pipe(
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          this.transferState.set<TransferHttpResponse>(storeKey, {
            body: event.body,
            headers: this.getHeaders(event.headers),
            status: event.status,
            statusText: event.statusText,
            url: event.url ?? '',
            responseType: req.responseType,
          });
        }
      }),
    );
  }

  private getHeaders(headers: HttpHeaders): Record<string, string[]> {
    const headersMap: Record<string, string[]> = {};

    for (const key of headers.keys()) {
      const value = headers.getAll(key);
      if (typeof value === 'string') {
        headersMap[key] = value;
      }
    }

    return headersMap;
  }
}
