/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ApplicationRef, StaticProvider, Type } from '@angular/core';
import { renderApplication, renderModule } from '@angular/platform-server';

/**
 * Renders an Angular application or module to an HTML string.
 *
 * This function determines whether the provided `bootstrap` value is an Angular module
 * or a bootstrap function and calls the appropriate rendering method (`renderModule` or
 * `renderApplication`) based on that determination.
 *
 * @param html - The HTML string to be used as the initial document content.
 * @param bootstrap - Either an Angular module type or a function that returns a promise
 *                    resolving to an `ApplicationRef`.
 * @param url - The URL of the application. This is used for server-side rendering to
 *              correctly handle route-based rendering.
 * @param platformProviders - An array of platform providers to be used during the
 *                             rendering process.
 * @returns A promise that resolves to a string containing the rendered HTML.
 */
export function renderAngular(
  html: string,
  bootstrap: Type<unknown> | (() => Promise<ApplicationRef>),
  url: string,
  platformProviders: StaticProvider[],
): Promise<string> {
  return isNgModule(bootstrap)
    ? renderModule(bootstrap, { url, document: html, extraProviders: platformProviders })
    : renderApplication(bootstrap, {
        url,
        document: html,
        platformProviders,
      });
}

/**
 * Type guard to determine if a given value is an Angular module.
 * Angular modules are identified by the presence of the `ɵmod` static property.
 * This function helps distinguish between Angular modules and bootstrap functions.
 *
 * @param value - The value to be checked.
 * @returns True if the value is an Angular module (i.e., it has the `ɵmod` property), false otherwise.
 */
export function isNgModule(
  value: Type<unknown> | (() => Promise<ApplicationRef>),
): value is Type<unknown> {
  return typeof value === 'object' && 'ɵmod' in value;
}
