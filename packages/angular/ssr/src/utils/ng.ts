/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import {
  ApplicationRef,
  type PlatformRef,
  REQUEST,
  type StaticProvider,
  type Type,
  ɵConsole,
} from '@angular/core';
import { BootstrapContext } from '@angular/platform-browser';
import {
  INITIAL_CONFIG,
  ɵSERVER_CONTEXT as SERVER_CONTEXT,
  platformServer,
  ɵrenderInternal as renderInternal,
} from '@angular/platform-server';
import { ActivatedRoute, Router } from '@angular/router';
import { Console } from '../console';
import { addTrailingSlash, joinUrlParts, stripIndexHtmlFromURL, stripTrailingSlash } from './url';

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
 * This function supports both Angular modules and bootstrap functions for application initialization.
 *
 * @param html - The initial HTML document content.
 * @param bootstrap - An Angular module type or a function returning a promise that resolves to an `ApplicationRef`.
 * @param url - The application URL, used for route-based rendering in SSR.
 * @param platformProviders - An array of platform providers for the rendering process.
 * @param serverContext - A string representing the server context, providing additional metadata for SSR.
 * @returns A promise resolving to an object containing:
 *          - `hasNavigationError`: Indicates if a navigation error occurred.
 *          - `redirectTo`: (Optional) The redirect URL if a navigation redirect occurred.
 *          - `content`: A function returning a promise that resolves to the rendered HTML string.
 */
export async function renderAngular(
  html: string,
  bootstrap: AngularBootstrap,
  url: URL,
  platformProviders: StaticProvider[],
  serverContext: string,
): Promise<
  | { hasNavigationError: true }
  | { hasNavigationError: boolean; redirectTo?: string; content: () => Promise<string> }
> {
  // A request to `http://www.example.com/page/index.html` will render the Angular route corresponding to `http://www.example.com/page`.
  const urlToRender = stripIndexHtmlFromURL(url);
  const platformRef = platformServer([
    {
      provide: INITIAL_CONFIG,
      useValue: {
        url: urlToRender.href,
        document: html,
      },
    },
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
  ]);

  let redirectTo: string | undefined;
  let hasNavigationError = true;

  try {
    let applicationRef: ApplicationRef;
    if (isNgModule(bootstrap)) {
      const moduleRef = await platformRef.bootstrapModule(bootstrap);
      applicationRef = moduleRef.injector.get(ApplicationRef);
    } else {
      applicationRef = await bootstrap({ platformRef });
    }

    // Block until application is stable.
    await applicationRef.whenStable();

    // This code protect against app destruction during bootstrapping which is a
    // valid case. We should not assume the `applicationRef` is not in destroyed state.
    // Calling `envInjector.get` would throw `NG0205: Injector has already been destroyed`.
    if (applicationRef.destroyed) {
      return { hasNavigationError: true };
    }

    // TODO(alanagius): Find a way to avoid rendering here especially for redirects as any output will be discarded.
    const envInjector = applicationRef.injector;
    const routerIsProvided = !!envInjector.get(ActivatedRoute, null);
    const router = envInjector.get(Router);
    const lastSuccessfulNavigation = router.lastSuccessfulNavigation();

    if (!routerIsProvided) {
      hasNavigationError = false;
    } else if (lastSuccessfulNavigation?.finalUrl) {
      hasNavigationError = false;

      const requestPrefix =
        envInjector.get(APP_BASE_HREF, null, { optional: true }) ??
        envInjector.get(REQUEST, null, { optional: true })?.headers.get('X-Forwarded-Prefix');

      const { pathname, search, hash } = envInjector.get(PlatformLocation);
      const finalUrl = constructSerializedUrl(router, { pathname, search, hash }, requestPrefix);
      const urlToRenderString = constructSerializedUrl(router, urlToRender, requestPrefix);

      if (urlToRenderString !== finalUrl) {
        redirectTo = [pathname, search, hash].join('');
      }
    }

    return {
      hasNavigationError,
      redirectTo,
      content: () =>
        new Promise<string>((resolve, reject) => {
          // Defer rendering to the next event loop iteration to avoid blocking, as most operations in `renderInternal` are synchronous.
          setTimeout(() => {
            renderInternal(platformRef, applicationRef)
              .then(resolve)
              .catch(reject)
              .finally(() => void asyncDestroyPlatform(platformRef));
          }, 0);
        }),
    };
  } catch (error) {
    await asyncDestroyPlatform(platformRef);

    throw error;
  } finally {
    if (hasNavigationError || redirectTo) {
      void asyncDestroyPlatform(platformRef);
    }
  }
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

/**
 * Gracefully destroys the application in a macrotask, allowing pending promises to resolve
 * and surfacing any potential errors to the user.
 *
 * @param platformRef - The platform reference to be destroyed.
 */
function asyncDestroyPlatform(platformRef: PlatformRef): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!platformRef.destroyed) {
        platformRef.destroy();
      }

      resolve();
    }, 0);
  });
}

/**
 * Constructs a normalized and serialized URL string from its components.
 *
 * This function uses the provided `Router` instance to parse and serialize the URL,
 * ensuring that the resulting string is consistent with the router's configuration.
 * It also handles the optional `prefix` parameter to ensure proper URL construction.
 *
 * @param router - The `Router` instance to use for parsing and serializing the URL.
 * @param url - An object containing the URL components:
 *   - `pathname`: The path of the URL.
 *   - `search`: The query string of the URL (including '?').
 *   - `hash`: The hash fragment of the URL (including '#').
 * @param prefix - An optional prefix (e.g., `APP_BASE_HREF`) to prepend to the pathname
 * if it is not already present.
 * @returns The normalized and serialized URL string.
 *
 * @note
 * We use the Angular `Router` to construct the URL, so that the URL is consistent with the router's configuration.
 * This is important for the URL to be correctly parsed and serialized by the router as it might have different encodings.
 */
function constructSerializedUrl(
  router: Router,
  url: { pathname: string; search: string; hash: string },
  prefix?: string | null,
): string {
  const { pathname, hash, search } = url;
  const urlParts: string[] = [];
  if (prefix && !addTrailingSlash(pathname).startsWith(addTrailingSlash(prefix))) {
    urlParts.push(joinUrlParts(prefix, pathname));
  } else {
    urlParts.push(stripTrailingSlash(pathname));
  }

  urlParts.push(search, hash);

  const urlTree = router.parseUrl(urlParts.join(''));

  return router.serializeUrl(urlTree);
}
