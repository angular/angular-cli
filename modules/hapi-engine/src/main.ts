/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Request, ResponseToolkit } from '@hapi/hapi';

import { StaticProvider } from '@angular/core';
import { ɵCommonEngine as CommonEngine, ɵRenderOptions } from '@nguniversal/common/engine';
import { REQUEST, RESPONSE } from '@nguniversal/hapi-engine/tokens';

/**
 * These are the allowed options for the render
 *
 * @deprecated use `@nguniversal/common` instead.
 */
export interface RenderOptions extends ɵRenderOptions {
  req: Request;
  res?: ResponseToolkit;
}

/**
 * The CommonEngine with module to facory map in case of JIT.
 */
const commonEngine = new CommonEngine();

/**
 * This is an express engine for handling Angular Applications
 * @deprecated use `@nguniversal/common` instead.
 */
export async function ngHapiEngine(options: Readonly<RenderOptions>): Promise<string> {
  const req = options.req;
  if (req.raw.req.url === undefined) {
    throw new Error('url is undefined');
  }

  const protocol = req.server.info.protocol;
  const filePath = req.raw.req.url as string;

  const renderOptions: RenderOptions = {...options};

  const moduleOrFactory = options.bootstrap;

  if (!moduleOrFactory) {
    throw new Error('You must pass in a NgModule or NgModuleFactory to be bootstrapped');
  }

  renderOptions.url = options.url || `${protocol}://${req.info.host}${req.path}`;
  renderOptions.documentFilePath = renderOptions.documentFilePath || filePath;
  renderOptions.providers = [...(options.providers || []), getReqProviders(options.req)];

  return commonEngine.render(renderOptions);
}

/**
 * Get providers of the request and response
 */
function getReqProviders(req: Request): StaticProvider[] {
  const providers: StaticProvider[] = [
    {
      provide: REQUEST,
      useValue: req
    }
  ];
  providers.push({
    provide: RESPONSE,
    useValue: req.raw.res
  });

  return providers;
}
