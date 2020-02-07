/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';  // tslint:disable-line:no-implicit-dependencies
import * as ts from 'typescript';
import { removeIvyJitSupportCalls } from './remove-ivy-jit-support-calls';
import { createTypescriptContext, transformTypescript } from './spec_helpers';

function transform(
  input: string,
  transformerFactory: (
    getTypeChecker: () => ts.TypeChecker,
  ) => ts.TransformerFactory<ts.SourceFile>,
) {
  const { program, compilerHost } = createTypescriptContext(input);
  const getTypeChecker = () => program.getTypeChecker();
  const transformer = transformerFactory(getTypeChecker);

  return transformTypescript(input, [transformer], program, compilerHost);
}

const input = tags.stripIndent`
  export class AppModule {
  }
  AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
  AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
              BrowserModule,
              AppRoutingModule
          ]] });
  (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(AppModule, { declarations: [AppComponent,
          ExampleComponent], imports: [BrowserModule,
          AppRoutingModule] }); })();
  /*@__PURE__*/ (function () { i0.ɵsetClassMetadata(AppModule, [{
          type: NgModule,
          args: [{
                  declarations: [
                      AppComponent,
                      ExampleComponent
                  ],
                  imports: [
                      BrowserModule,
                      AppRoutingModule
                  ],
                  providers: [],
                  bootstrap: [AppComponent]
              }]
      }], null, null); })();
`;

describe('@ngtools/webpack transformers', () => {
  describe('remove-ivy-dev-calls', () => {
    it('should allow removing only set class metadata', () => {
      const output = tags.stripIndent`
        export class AppModule {
        }
        AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
                    BrowserModule,
                    AppRoutingModule
                ]] });
        (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(AppModule, { declarations: [AppComponent,
                ExampleComponent], imports: [BrowserModule,
                AppRoutingModule] }); })();
      `;

      const result = transform(input, getTypeChecker =>
        removeIvyJitSupportCalls(true, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should allow removing only ng module scope', () => {
      const output = tags.stripIndent`
        export class AppModule {
        }
        AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
                    BrowserModule,
                    AppRoutingModule
                ]] });
        /*@__PURE__*/ (function () { i0.ɵsetClassMetadata(AppModule, [{
                type: NgModule,
                args: [{
                        declarations: [
                            AppComponent,
                            ExampleComponent
                        ],
                        imports: [
                            BrowserModule,
                            AppRoutingModule
                        ],
                        providers: [],
                        bootstrap: [AppComponent]
                    }]
            }], null, null); })();
      `;

      const result = transform(input, getTypeChecker =>
        removeIvyJitSupportCalls(false, true, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should allow removing both set class metadata and ng module scope', () => {
      const output = tags.stripIndent`
        export class AppModule {
        }
        AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
                    BrowserModule,
                    AppRoutingModule
                ]] });
      `;

      const result = transform(input, getTypeChecker =>
        removeIvyJitSupportCalls(true, true, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should allow removing neither set class metadata nor ng module scope', () => {
      const result = transform(input, getTypeChecker =>
        removeIvyJitSupportCalls(false, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
    });

    it('should strip unused imports when removing set class metadata and ng module scope', () => {
      const imports = tags.stripIndent`
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { AppRoutingModule } from './app-routing.module';
        import { AppComponent } from './app.component';
        import { ExampleComponent } from './example/example.component';
        import * as i0 from "@angular/core";
      `;

      const output = tags.stripIndent`
        import { BrowserModule } from '@angular/platform-browser';
        import { AppRoutingModule } from './app-routing.module';
        import { AppComponent } from './app.component';
        import * as i0 from "@angular/core";
        export class AppModule {
        }
        AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
                    BrowserModule,
                    AppRoutingModule
                ]] });
      `;

      const result = transform(imports + input, getTypeChecker =>
        removeIvyJitSupportCalls(true, true, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

  });
});
