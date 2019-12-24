/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Request, ResponseToolkit } from '@hapi/hapi';
import * as fs from 'fs';

import { NgModuleFactory, StaticProvider, Type } from '@angular/core';
import { ɵCommonEngine as CommonEngine } from '@nguniversal/common/engine';
import { REQUEST, RESPONSE } from '@nguniversal/hapi-engine/tokens';

/**
 * These are the allowed options for the engine
 */
export interface NgSetupOptions {
  bootstrap: Type<{}> | NgModuleFactory<{}>;
  providers?: StaticProvider[];
}

/**
 * These are the allowed options for the render
 */
export interface RenderOptions extends NgSetupOptions {
  req: Request;
  res?: ResponseToolkit;
  url?: string;
  document?: string;
}

/**
 * This holds a cached version of each index used.
 */
const templateCache: { [key: string]: string } = {};

/**
 * The CommonEngine with module to facory map in case of JIT.
 */
const commonEngine = new CommonEngine(undefined);

/**
 * This is an express engine for handling Angular Applications
 */
export function ngHapiEngine(options: Readonly<RenderOptions>) {
  const req = options.req;
  if (req.raw.req.url === undefined) {
    return Promise.reject(new Error('url is undefined'));
  }

  const protocol = req.server.info.protocol;
  const filePath = req.raw.req.url as string;

  const renderOptions: RenderOptions = Object.assign({}, options);

  return new Promise((resolve, reject) => {
    const moduleOrFactory = options.bootstrap;

    if (!moduleOrFactory) {
      return reject(new Error('You must pass in a NgModule or NgModuleFactory to be bootstrapped'));
    }

    renderOptions.url = options.url || `${protocol}://${req.info.host}${req.path}`;
    renderOptions.document = options.document || getDocument(filePath);

    renderOptions.providers = options.providers || [];
    renderOptions.providers = renderOptions.providers.concat(getReqProviders(options.req));

    commonEngine.render(renderOptions).then(resolve, reject);
  });
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

/**
 * Get the document at the file path
 */
function getDocument(filePath: string): string {
  return templateCache[filePath] = templateCache[filePath] || fs.readFileSync(filePath).toString();
}
