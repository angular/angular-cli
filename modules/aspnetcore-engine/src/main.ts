/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { StaticProvider } from '@angular/core';

import { ORIGIN_URL, REQUEST } from '@nguniversal/aspnetcore-engine/tokens';
import { ɵCommonEngine as CommonEngine, ɵRenderOptions as RenderOptions } from '@nguniversal/common/engine';
import { createDocument } from 'domino';
import { IEngineOptions } from './interfaces/engine-options';
import { IEngineRenderResult } from './interfaces/engine-render-result';

/* @internal */
function _getUniversalData(content: string, appSelector: string): IEngineRenderResult {
  const doc = createDocument(content, true);

  const styles: string[] = [];
  const scripts: string[] = [];
  const meta: string[] = [];
  const links: string[] = [];

  // tslint:disable: no-non-null-assertion
  const elements = [
    ...Array.from(doc.head!.children),
    ...Array.from(doc.body!.children),
  ];
  // tslint:enable: no-non-null-assertion

  for (const element of elements) {
    switch (element.tagName.toUpperCase()) {
      case 'SCRIPT':
        scripts.push(element.outerHTML);
        break;
      case 'STYLE':
        styles.push(element.outerHTML);
        break;
      case 'LINK':
        links.push(element.outerHTML);
        break;
      case 'META':
        meta.push(element.outerHTML);
        break;
      default:
        break;
    }
  }

  return {
    completeHTML: content,
    // tslint:disable-next-line: no-non-null-assertion
    html: doc.querySelector(appSelector)!.outerHTML,
    globals: {
      title: doc.title,
      scripts: scripts.join('\n'),
      styles: styles.join('\n'),
      meta: meta.join('\n'),
      links: links.join('\n')
    }
  };
}

const commonEngine = new CommonEngine();
export async function ngAspnetCoreEngine(options: Readonly<IEngineOptions>)
  : Promise<IEngineRenderResult> {
  if (!options.appSelector) {
    const selector = `" appSelector: '<app-root></app-root>' "`;
    throw new Error(`appSelector is required! Pass in ${selector},
     for your root App component.`);
  }


  const renderOptions: RenderOptions = {
    url: options.url || options.request.absoluteUrl,
    document: options.document || options.appSelector,
    providers: [...(options.providers || []), getReqResProviders(options.request.origin, options.request.data.request)],
    bootstrap: options.ngModule,
    inlineCriticalCss: options.inlineCriticalCss,
  };


  // Grab the DOM "selector" from the passed in Template <app-root> for example = "app-root"
  const appSelector = options.appSelector.substring(1, options.appSelector.indexOf('>'));
  const html = await commonEngine.render(renderOptions);

  return _getUniversalData(html, appSelector);
}

/**
 * Get providers of the request and response
 */
function getReqResProviders(origin: string, request: string): StaticProvider[] {
  const providers: StaticProvider[] = [
    {
      provide: ORIGIN_URL,
      useValue: origin
    },
    {
      provide: REQUEST,
      useValue: request
    }
  ];

  return providers;
}

