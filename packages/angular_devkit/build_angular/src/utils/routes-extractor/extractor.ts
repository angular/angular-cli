/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ApplicationRef, Injector, Type, createPlatformFactory, platformCore } from '@angular/core';
import {
  INITIAL_CONFIG,
  ɵINTERNAL_SERVER_PLATFORM_PROVIDERS as INTERNAL_SERVER_PLATFORM_PROVIDERS,
} from '@angular/platform-server';
import { Route, Router, ɵROUTER_PROVIDERS } from '@angular/router';
import { first } from 'rxjs/operators'; // Import from `/operators` to support rxjs 6 which is still supported by the Framework.

// TODO(alanagius): replace the below once `RouterConfigLoader` is privately exported from `@angular/router`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RouterConfigLoader = ɵROUTER_PROVIDERS[5] as any;
type RouterConfigLoader = typeof RouterConfigLoader;

interface RouterResult {
  route: string;
  success: boolean;
  redirect: boolean;
}

async function* getRoutesFromRouterConfig(
  routes: Route[],
  routerConfigLoader: RouterConfigLoader,
  injector: Injector,
  parent = '',
): AsyncIterableIterator<RouterResult> {
  for (const route of routes) {
    const { path, redirectTo, loadChildren, children } = route;
    if (path === undefined) {
      continue;
    }

    const currentRoutePath = buildRoutePath(parent, path);

    if (redirectTo !== undefined) {
      // TODO: handle `redirectTo`.
      yield { route: currentRoutePath, success: false, redirect: true };
      continue;
    }

    if (/[:*]/.test(path)) {
      // TODO: handle parameterized routes population.
      yield { route: currentRoutePath, success: false, redirect: false };
      continue;
    }

    yield { route: currentRoutePath, success: true, redirect: false };

    if (children?.length || loadChildren) {
      yield* getRoutesFromRouterConfig(
        children ?? (await routerConfigLoader.loadChildren(injector, route).toPromise()).routes,
        routerConfigLoader,
        injector,
        currentRoutePath,
      );
    }
  }
}

export async function* extractRoutes(
  bootstrapAppFnOrModule: (() => Promise<ApplicationRef>) | Type<unknown>,
  document: string,
): AsyncIterableIterator<RouterResult> {
  const platformRef = createPlatformFactory(platformCore, 'server', [
    [
      {
        provide: INITIAL_CONFIG,
        useValue: { document, url: '' },
      },
    ],
    ...INTERNAL_SERVER_PLATFORM_PROVIDERS,
  ])();

  try {
    let applicationRef: ApplicationRef;
    if (isBootstrapFn(bootstrapAppFnOrModule)) {
      applicationRef = await bootstrapAppFnOrModule();
    } else {
      const moduleRef = await platformRef.bootstrapModule(bootstrapAppFnOrModule);
      applicationRef = moduleRef.injector.get(ApplicationRef);
    }

    // Wait until the application is stable.
    await applicationRef.isStable.pipe(first((isStable) => isStable)).toPromise();

    const injector = applicationRef.injector;
    const router = injector.get(Router);
    const routerConfigLoader = injector.get(RouterConfigLoader);

    // Extract all the routes from the config.
    yield* getRoutesFromRouterConfig(router.config, routerConfigLoader, injector);
  } finally {
    platformRef.destroy();
  }
}

function isBootstrapFn(value: unknown): value is () => Promise<ApplicationRef> {
  // We can differentiate between a module and a bootstrap function by reading compiler-generated `ɵmod` static property:
  return typeof value === 'function' && !('ɵmod' in value);
}

function buildRoutePath(...routeParts: string[]): string {
  return routeParts.filter(Boolean).join('/');
}
