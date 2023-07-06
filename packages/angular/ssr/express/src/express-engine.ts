/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import type { StaticProvider } from '@angular/core';
import {CommonEngine, CommonEngineRenderOptions} from '@angular/ssr';
import { REQUEST, RESPONSE } from '@angular/ssr/express/tokens';
import type { Request, Response } from 'express';

/**
 * These are the allowed options for the engine
 */
export interface NgExpressEngineOptions
  extends Pick<CommonEngineRenderOptions, 'providers' | 'publicPath' | 'inlineCriticalCss'> {
  bootstrap: NonNullable<CommonEngineRenderOptions['bootstrap']>;
}

/**
 * These are the allowed options for the render
 */
export interface NgExpressEngineRenderOptions extends CommonEngineRenderOptions {
  req: Request;
  res?: Response;
}

/**
 * This is an express engine for handling Angular Applications
 */
export function NgExpressEngine(setupOptions: Readonly<NgExpressEngineOptions>) {
  const engine = new CommonEngine(setupOptions.bootstrap, setupOptions.providers);

  return function (
    path: string,
    options: object,
    callback: (err?: Error | null, html?: string) => void,
  ) {
    try {
      const renderOptions = { ...options } as NgExpressEngineRenderOptions;
      if (!setupOptions.bootstrap && !renderOptions.bootstrap) {
        throw new Error('You must pass in a NgModule to be bootstrapped.');
      }

      const { req } = renderOptions;
      const res = renderOptions.res ?? req.res;

      renderOptions.url =
        renderOptions.url ?? `${req.protocol}://${req.get('host') || ''}${req.baseUrl}${req.url}`;
      renderOptions.documentFilePath = renderOptions.documentFilePath ?? path;
      renderOptions.providers = [...(renderOptions.providers ?? []), getReqResProviders(req, res)];
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      renderOptions.publicPath =
        renderOptions.publicPath ?? setupOptions.publicPath ?? (options as any).settings?.views;
      renderOptions.inlineCriticalCss =
        renderOptions.inlineCriticalCss ?? setupOptions.inlineCriticalCss;

      engine
        .render(renderOptions)
        .then((html) => callback(null, html))
        .catch(callback);
    } catch (err) {
      callback(err);
    }
  };
}

/**
 * Get providers of the request and response
 */
function getReqResProviders(req: Request, res?: Response): StaticProvider[] {
  const providers: StaticProvider[] = [
    {
      provide: REQUEST,
      useValue: req,
    },
  ];
  if (res) {
    providers.push({
      provide: RESPONSE,
      useValue: res,
    });
  }

  return providers;
}
