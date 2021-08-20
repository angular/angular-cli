/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { ApplicationRef, Injectable, NgModule } from '@angular/core';
import {
  BrowserTransferStateModule,
  StateKey,
  TransferState,
  makeStateKey,
} from '@angular/platform-browser';
import { Observable, of as observableOf } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';

export interface TransferHttpResponse {
  body?: any | null;
  headers?: Record<string, string[]>;
  status?: number;
  statusText?: string;
  url?: string;
}

function getHeadersMap(headers: HttpHeaders): Record<string, string[]> {
  const headersMap: Record<string, string[]> = {};
  for (const key of headers.keys()) {
    const values = headers.getAll(key);
    if (values !== null) {
      headersMap[key] = values;
    }
  }

  return headersMap;
}

@Injectable()
export class TransferHttpCacheInterceptor implements HttpInterceptor {
  private isCacheActive = true;

  private invalidateCacheEntry(url: string) {
    Object.keys(this.transferState['store']).forEach((key) =>
      key.includes(url) ? this.transferState.remove(makeStateKey(key)) : null,
    );
  }

  private makeCacheKey(method: string, url: string, params: HttpParams): StateKey<string> {
    // make the params encoded same as a url so it's easy to identify
    const encodedParams = params
      .keys()
      .sort()
      .map((k) => `${k}=${params.getAll(k)}`)
      .join('&');
    const key = (method === 'GET' ? 'G.' : 'H.') + url + '?' + encodedParams;

    return makeStateKey<TransferHttpResponse>(key);
  }

  constructor(appRef: ApplicationRef, private transferState: TransferState) {
    // Stop using the cache if the application has stabilized, indicating initial rendering is
    // complete.
    appRef.isStable
      .pipe(
        filter((isStable: boolean) => isStable),
        take(1),
      )
      .subscribe(() => {
        this.isCacheActive = false;
      });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Stop using the cache if there is a mutating call.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      this.isCacheActive = false;
      this.invalidateCacheEntry(req.url);
    }

    if (!this.isCacheActive) {
      // Cache is no longer active. Pass the request through.
      return next.handle(req);
    }

    const storeKey = this.makeCacheKey(req.method, req.url, req.params);

    if (this.transferState.hasKey(storeKey)) {
      // Request found in cache. Respond using it.
      const response = this.transferState.get<TransferHttpResponse>(storeKey, {});

      return observableOf(
        new HttpResponse<any>({
          body: response.body,
          headers: new HttpHeaders(response.headers),
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        }),
      );
    } else {
      // Request not found in cache. Make the request and cache it.
      const httpEvent = next.handle(req);

      return httpEvent.pipe(
        tap((event: HttpEvent<unknown>) => {
          if (event instanceof HttpResponse) {
            this.transferState.set<TransferHttpResponse>(storeKey, {
              body: event.body,
              headers: getHeadersMap(event.headers),
              status: event.status,
              statusText: event.statusText,
              url: event.url || '',
            });
          }
        }),
      );
    }
  }
}

/**
 * An NgModule used in conjunction with `ServerTransferHttpCacheModule` to transfer cached HTTP
 * calls from the server to the client application.
 */
@NgModule({
  imports: [BrowserTransferStateModule],
  providers: [
    TransferHttpCacheInterceptor,
    { provide: HTTP_INTERCEPTORS, useExisting: TransferHttpCacheInterceptor, multi: true },
  ],
})
export class TransferHttpCacheModule {}
