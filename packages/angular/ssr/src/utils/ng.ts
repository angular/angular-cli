/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ɵConsole } from '@angular/core';
import type { ApplicationRef, StaticProvider, Type } from '@angular/core';
import { BootstrapContext } from '@angular/platform-browser';
import {
  ɵSERVER_CONTEXT as SERVER_CONTEXT,
  renderApplication,
  renderModule,
} from '@angular/platform-server';
import { Console } from '../console';
import { stripIndexHtmlFromURL } from './url';

/**
 * Represents the bootstrap mechanism for an Angular application.
 *
 * This type can either be:
 * - A reference to an Angular component or module (`Type<unknown>`) that serves as the root of the application.
 * - A function that returns a `Promise<ApplicationRef>`, which resolves with the root application reference.
 */
export type AngularBootstrap =
  | Type<unknown>
  | ((context: BootstrapContext) => Promise<ApplicationRef>);

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
 * @param serverContext - A string representing the server context, used to provide additional
 *                        context or metadata during server-side rendering.
 * @returns A promise that resolves to a string containing the rendered HTML.
 */
export function renderAngular(
  html: string,
  bootstrap: AngularBootstrap,
  url: URL,
  platformProviders: StaticProvider[],
  serverContext: string,
): Promise<string> {
  const providers = [
    {
      provide: SERVER_CONTEXT,
      useValue: serverContext,
    },
    {
      // An Angular Console Provider that does not print a set of predefined logs.
      provide: ɵConsole,
      // Using `useClass` would necessitate decorating `Console` with `@Injectable`,
      // which would require switching from `ts_library` to `ng_module`. This change
      // would also necessitate various patches of `@angular/bazel` to support ESM.
      useFactory: () => new Console(),
    },
    ...platformProviders,
  ];

  // A request to `http://www.example.com/page/index.html` will render the Angular route corresponding to `http://www.example.com/page`.
  const urlToRender = stripIndexHtmlFromURL(url).toString();

  return isNgModule(bootstrap)
    ? renderModule(bootstrap, {
        url: urlToRender,
        document: html,
        extraProviders: providers,
      })
    : renderApplication(bootstrap, {
        url: urlToRender,
        document: html,
        platformProviders: providers,
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
export function isNgModule(value: AngularBootstrap): value is Type<unknown> {
  return 'ɵmod' in value;
}
