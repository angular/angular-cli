/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import { PLATFORM } from '../interfaces';
import { replaceIsPlatformCalls } from './replace_is_platform_calls';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

describe('@ngtools/webpack transformers', () => {
  describe('replace_is_platform_calls', () => {
    describe('Browser platform', () => {
      it('should replace isPlatformBrowser and isPlatformServer if the platform is browser', () => {
        const input = tags.stripIndent`
          import { enableProdMode } from '@angular/core';
          import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
          import { PLATFORM_ID, isPlatformBrowser, isPlatformServer } from '@angular/common';

          import { AppModule } from './app/app.module';
          import { environment } from './environments/environment';

          if (environment.production) {
            enableProdMode();
          }

          platformBrowserDynamic().bootstrapModule(AppModule).then(ref => {
            const platformId = ref.injector.get(PLATFORM_ID);

            isPlatformBrowser(platformId) && console.log('browser');
            isPlatformServer(platformId) && console.log('server');

            if (true && isPlatformBrowser(platformId)) {
              console.log('browser');
            }
            if (true && isPlatformServer(platformId)) {
              console.log('server');
            }
          });
        `;
        const output = tags.stripIndent`
          import { enableProdMode } from '@angular/core';
          import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
          import { PLATFORM_ID, isPlatformBrowser, isPlatformServer } from '@angular/common';

          import { AppModule } from './app/app.module';
          import { environment } from './environments/environment';

          if (environment.production) {
            enableProdMode();
          }

          platformBrowserDynamic().bootstrapModule(AppModule).then(ref => {
            const platformId = ref.injector.get(PLATFORM_ID);

            true && console.log('browser');
            false && console.log('server');

            if (true && true) {
              console.log('browser');
            }
            if (true && false) {
              console.log('server');
            }
          });
        `;

        const { program, compilerHost } = createTypescriptContext(input);
        const transformer = replaceIsPlatformCalls(PLATFORM.Browser);
        const result = transformTypescript(undefined, [transformer], program, compilerHost);
        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });
    });

    describe('Server platform', () => {
      it('should replace isPlatformBrowser and isPlatformServer if the platform is browser', () => {
        const input = tags.stripIndent`
          export class AppModule {
            constructor(injector: Injector) {
              const platformId = injector.get(PLATFORM_ID);

              isPlatformServer(platformId) && console.log('server');
              isPlatformBrowser(platformId) && console.log('browser');

              if (isPlatformServer(platformId)) {
                console.log('server');
              }
              if (isPlatformBrowser(platformId)) {
                console.log('browser');
              }
            }
          }
        `;
        const output = tags.stripIndent`
          export class AppModule {
            constructor(injector) {
              const platformId = injector.get(PLATFORM_ID);

              true && console.log('server');
              false && console.log('browser');

              if (true) {
                console.log('server');
              }
              if (false) {
                console.log('browser');
              }
            }
          }
        `;

        const { program, compilerHost } = createTypescriptContext(input);
        const transformer = replaceIsPlatformCalls(PLATFORM.Server);
        const result = transformTypescript(undefined, [transformer], program, compilerHost);
        expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
      });
    });
  });
});
