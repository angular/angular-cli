/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import * as ts from 'typescript';
import { findImageDomains } from './find_image_domains';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

function findDomains(
  input: string,
  importHelpers = true,
  module: ts.ModuleKind = ts.ModuleKind.ES2020,
) {
  const { program, compilerHost } = createTypescriptContext(input, undefined, undefined, {
    importHelpers,
    module,
  });
  const domains = new Set<string>();
  const transformer = findImageDomains(domains);

  transformTypescript(input, [transformer], program, compilerHost);

  return domains;
}

function inputTemplateAppModule(provider: string) {
  /* eslint-disable max-len */
  return tags.stripIndent`
    export class AppModule {
        static ɵfac = function AppModule_Factory(t) { return new (t || AppModule)(); };
        static ɵmod = /*@__PURE__*/ i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        static ɵinj = /*@__PURE__*/ i0.ɵɵdefineInjector({ providers: [
                ${provider}
            ], imports: [BrowserModule] });
    }
    (function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AppModule, [{
            type: NgModule,
            args: [{
                    declarations: [
                        AppComponent
                    ],
                    imports: [
                        BrowserModule,
                        NgOptimizedImage
                    ],
                    providers: [
                        ${provider}
                    ],
                    bootstrap: [AppComponent]
                }]
        }], null, null); })();
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(AppModule, { declarations: [AppComponent], imports: [BrowserModule,
            NgOptimizedImage] }); })();
  `;
}

function inputTemplateComponent(provider: string) {
  /* eslint-disable max-len */
  return tags.stripIndent`
    export class AppComponent {
      title = 'angular-cli-testbed';
      static ɵfac = function AppComponent_Factory(t) { return new (t || AppComponent)(); };
      static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: AppComponent, selectors: [["app-root"]], standalone: true, features: [i0.ɵɵProvidersFeature([
                  ${provider}
              ]), i0.ɵɵStandaloneFeature], decls: 2, vars: 0, template: function AppComponent_Template(rf, ctx) { if (rf & 1) {
              i0.ɵɵelementStart(0, "div");
              i0.ɵɵtext(1, "Hello world");
              i0.ɵɵelementEnd();
          } } });
    }
    (function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AppComponent, [{
            type: Component,
            args: [{ selector: 'app-root', imports: [NgOptimizedImage, NgSwitchCase, NgSwitchDefault, NgSwitch], standalone: true, providers: [
                        ${provider}
                    ], template: "<div>Hello world</div>\n\n" }]
        }], null, null); })();
  `;
}

function runSharedTests(template: (povider: string) => string) {
  it('should find a domain when a built-in loader is used with a string-literal-like argument', () => {
    // Intentionally inconsistent use of quote styles in this data structure:
    const builtInLoaders: Array<[string, string]> = [
      ['provideCloudflareLoader("www.cloudflaredomain.com")', 'www.cloudflaredomain.com'],
      [
        "provideCloudinaryLoader('https://www.cloudinarydomain.net')",
        'https://www.cloudinarydomain.net',
      ],
      ['provideImageKitLoader("www.imageKitdomain.com")', 'www.imageKitdomain.com'],
      ['provideImgixLoader(`www.imgixdomain.com/images/`)', 'www.imgixdomain.com/images/'],
    ];
    for (const loader of builtInLoaders) {
      const input = template(loader[0]);
      const result = Array.from(findDomains(input));
      expect(result.length).toBe(1);
      expect(result[0]).toBe(loader[1]);
    }
  });

  it('should find a domain in a custom loader function with a template literal', () => {
    const customLoader = tags.stripIndent`
      {
          provide: IMAGE_LOADER,
          useValue: (config: ImageLoaderConfig) => {
            return ${'`https://customLoaderTemplate.com/images?src=${config.src}&width=${config.width}`'};
          },
        },`;
    const input = template(customLoader);
    const result = Array.from(findDomains(input));
    expect(result.length).toBe(1);
    expect(result[0]).toBe('https://customLoaderTemplate.com/');
  });

  it('should find a domain when provider is alongside other providers', () => {
    const customLoader = tags.stripIndent`
          {
              provide: SOME_OTHER_PROVIDER,
              useValue: (config: ImageLoaderConfig) => {
              return "https://notacustomloaderstring.com/images?src=" + config.src + "&width=" + config.width;
              },
          },
          provideNotARealLoader("https://www.foo.com"),
          {
              provide: IMAGE_LOADER,
              useValue: (config: ImageLoaderConfig) => {
                  return ${'`https://customloadertemplate.com/images?src=${config.src}&width=${config.width}`'};
              },
          },
          {
              provide: YET_ANOTHER_PROVIDER,
              useValue: (config: ImageLoaderConfig) => {
              return ${'`https://notacustomloadertemplate.com/images?src=${config.src}&width=${config.width}`'};
              },
          },`;
    const input = template(customLoader);
    const result = Array.from(findDomains(input));
    expect(result.length).toBe(1);
    expect(result[0]).toBe('https://customloadertemplate.com/');
  });
}

describe('@ngtools/webpack transformers', () => {
  describe('find_image_domains (app module)', () => {
    runSharedTests(inputTemplateAppModule);
    runSharedTests(inputTemplateComponent);

    it('should not find a domain when a built-in loader is used with a variable', () => {
      const input = inputTemplateAppModule(`provideCloudflareLoader(myImageCDN)`);
      const result = Array.from(findDomains(input));
      expect(result.length).toBe(0);
    });

    it('should not find a domain when a built-in loader is used with an expression', () => {
      const input = inputTemplateAppModule(
        `provideCloudflareLoader("https://www." + (dev ? "dev." : "") + "cloudinarydomain.net")`,
      );
      const result = Array.from(findDomains(input));
      expect(result.length).toBe(0);
    });

    it('should not find a domain when a built-in loader is used with a template literal', () => {
      const input = inputTemplateAppModule(
        'provideCloudflareLoader(`https://www.${dev ? "dev." : ""}cloudinarydomain.net`)',
      );
      const result = Array.from(findDomains(input));
      expect(result.length).toBe(0);
    });

    it('should not find a domain in a function that is not a built-in loader', () => {
      const input = inputTemplateAppModule('provideNotARealLoader("https://www.foo.com")');
      const result = Array.from(findDomains(input));
      expect(result.length).toBe(0);
    });

    it('should find a domain in a custom loader function with string concatenation', () => {
      const customLoader = tags.stripIndent`
        {
            provide: IMAGE_LOADER,
            useValue: (config: ImageLoaderConfig) => {
              return "https://customLoaderString.com/images?src=" + config.src + "&width=" + config.width;
            },
          },`;
      const input = inputTemplateAppModule(customLoader);
      const result = Array.from(findDomains(input));
      expect(result.length).toBe(1);
      expect(result[0]).toBe('https://customLoaderString.com/');
    });

    it('should not find a domain if not an IMAGE_LOADER provider', () => {
      const customLoader = tags.stripIndent`
        {
            provide: SOME_OTHER_PROVIDER,
            useValue: (config: ImageLoaderConfig) => {
              return "https://customLoaderString.com/images?src=" + config.src + "&width=" + config.width;
            },
          },`;
      const input = inputTemplateAppModule(customLoader);
      const result = Array.from(findDomains(input));
      expect(result.length).toBe(0);
    });
  });
});
