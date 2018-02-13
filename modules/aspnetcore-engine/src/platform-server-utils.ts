/**
 * Copied from @angular/platform-server utils. https://github.com/angular/angular/blob/master/packages/platform-server/src/utils.ts
   Github issue to avoid copy/paste: https://github.com/angular/angular/issues/22049#issuecomment-363638743
 */

import { ApplicationRef, NgModuleFactory, NgModuleRef, PlatformRef, StaticProvider, Type } from '@angular/core';
import { ɵTRANSITION_ID } from '@angular/platform-browser';
import { filter } from 'rxjs/operator/filter';
import { first } from 'rxjs/operator/first';
import { toPromise } from 'rxjs/operator/toPromise';
import { platformDynamicServer, platformServer, BEFORE_APP_SERIALIZED, INITIAL_CONFIG, PlatformState } from '@angular/platform-server';

interface PlatformOptions {
  document?: string;
  url?: string;
  extraProviders?: StaticProvider[];
}

export interface ModuleRenderResult<T> {
  html: string;
  moduleRef: NgModuleRef<T>;
}

function _getPlatform(
  platformFactory: (extraProviders: StaticProvider[]) => PlatformRef,
  options: PlatformOptions): PlatformRef {
  const extraProviders = options.extraProviders ? options.extraProviders : [];
  return platformFactory([
    { provide: INITIAL_CONFIG, useValue: { document: options.document, url: options.url } },
    extraProviders
  ]);
}

function _render<T>(
  platform: PlatformRef, moduleRefPromise: Promise<NgModuleRef<T>>): Promise<ModuleRenderResult<T>> {
  return moduleRefPromise.then(moduleRef => {
    const transitionId = moduleRef.injector.get(ɵTRANSITION_ID, null);
    if (!transitionId) {
      throw new Error(
        `renderModule[Factory]() requires the use of BrowserModule.withServerTransition() to ensure
  the server-rendered app can be properly bootstrapped into a client app.`);
    }
    const applicationRef: ApplicationRef = moduleRef.injector.get(ApplicationRef);
    return toPromise
      .call(first.call(filter.call(applicationRef.isStable, (isStable: boolean) => isStable)))
      .then(() => {
        const platformState = platform.injector.get(PlatformState);

        // Run any BEFORE_APP_SERIALIZED callbacks just before rendering to string.
        const callbacks = moduleRef.injector.get(BEFORE_APP_SERIALIZED, null);
        if (callbacks) {
          for (const callback of callbacks) {
            try {
              callback();
            } catch (e) {
              // Ignore exceptions.
              console.warn('Ignoring BEFORE_APP_SERIALIZED Exception: ', e);
            }
          }
        }

        const output = platformState.renderToString();
        platform.destroy();
        return { html: output, moduleRef };
      });
  });
}

/**
 * Renders a Module to string.
 *
 * `document` is the full document HTML of the page to render, as a string.
 * `url` is the URL for the current render request.
 * `extraProviders` are the platform level providers for the current render request.
 *
 * Do not use this in a production server environment. Use pre-compiled {@link NgModuleFactory} with
 * {@link renderModuleFactory} instead.
 *
 * @experimental
 */
export function renderModule<T>(
  module: Type<T>, options: { document?: string, url?: string, extraProviders?: StaticProvider[] }):
  Promise<ModuleRenderResult<T>> {
  const platform = _getPlatform(platformDynamicServer, options);
  return _render(platform, platform.bootstrapModule(module));
}

/**
 * Renders a {@link NgModuleFactory} to string.
 *
 * `document` is the full document HTML of the page to render, as a string.
 * `url` is the URL for the current render request.
 * `extraProviders` are the platform level providers for the current render request.
 *
 * @experimental
 */
export function renderModuleFactory<T>(
  moduleFactory: NgModuleFactory<T>,
  options: { document?: string, url?: string, extraProviders?: StaticProvider[] }):
  Promise<ModuleRenderResult<T>> {
  const platform = _getPlatform(platformServer, options);
  return _render(platform, platform.bootstrapModuleFactory(moduleFactory));
}
