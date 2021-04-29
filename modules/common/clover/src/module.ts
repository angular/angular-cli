/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DOCUMENT, ɵPLATFORM_SERVER_ID as PLATFORM_SERVER_ID } from '@angular/common';
import {
  APP_ID,
  ApplicationRef,
  Inject,
  ModuleWithProviders,
  NgModule,
  Optional,
  PLATFORM_ID,
} from '@angular/core';
import {
  BrowserModule,
  TransferState,
  ɵDomSharedStylesHost as DomSharedStylesHost,
  ɵSharedStylesHost as SharedStylesHost,
  ɵescapeHtml as escapeHtml,
} from '@angular/platform-browser';
import { filter, mapTo, take } from 'rxjs/operators';
import { SSRStylesHost } from './styles_host';

export interface NGRenderModeAPI {
  getSerializedState: () => string | undefined;
  getWhenStable: () => Promise<void>;
  appId?: string;
}

export type NGRenderMode = boolean | undefined | NGRenderModeAPI;
declare let ngRenderMode: NGRenderMode;

@NgModule({
  exports: [BrowserModule],
  imports: [],
  providers: [],
})
export class RendererModule {
  constructor(
    private applicationRef: ApplicationRef,
    @Optional() private transferState?: TransferState,
    @Optional() @Inject(APP_ID) private appId?: string,
  ) {
    if (typeof ngRenderMode !== 'undefined' && ngRenderMode) {
      ngRenderMode = {
        getSerializedState: () =>
          this.transferState ? escapeHtml(this.transferState.toJson()) : undefined,
        appId: this.appId,
        getWhenStable: () =>
          this.applicationRef.isStable
            .pipe(
              filter((isStable) => isStable),
              take(1),
              mapTo(undefined),
            )
            .toPromise(),
      };
    }
  }

  static forRoot(): ModuleWithProviders<RendererModule> {
    return {
      ngModule: RendererModule,
      providers: [
        ...(typeof ngRenderMode !== 'undefined' && ngRenderMode
          ? [
              { provide: PLATFORM_ID, useValue: PLATFORM_SERVER_ID },
              { provide: SSRStylesHost, useClass: SSRStylesHost, deps: [DOCUMENT, APP_ID] },
            ]
          : [{ provide: SSRStylesHost, useClass: SSRStylesHost, deps: [DOCUMENT] }]),
        { provide: SharedStylesHost, useExisting: SSRStylesHost },
        { provide: DomSharedStylesHost, useClass: SSRStylesHost },
      ],
    };
  }
}
