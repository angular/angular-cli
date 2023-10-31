/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable max-len */
import { tags } from '@angular-devkit/core';
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

const inputNoPure = tags.stripIndent`
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
  (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadata(AppModule, [{
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

const inputArrowFnWithBody = tags.stripIndent`
  export class AppModule {
  }
  AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
  AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
              BrowserModule,
              AppRoutingModule
          ]] });
  (() => { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(AppModule, { declarations: [AppComponent,
          ExampleComponent], imports: [BrowserModule,
          AppRoutingModule] }); })();
  (() => { i0.ɵsetClassMetadata(AppModule, [{
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

const inputArrowFnWithImplicitReturn = tags.stripIndent`
  export class AppModule {
  }
  AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
  AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
              BrowserModule,
              AppRoutingModule
          ]] });
  (() => (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(AppModule, { declarations: [AppComponent,
          ExampleComponent], imports: [BrowserModule,
          AppRoutingModule] }))();
  (() => i0.ɵsetClassMetadata(AppModule, [{
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
      }], null, null))();
`;

const inputAsync = tags.stripIndent`
  export class TestCmp {
  }
  TestCmp.ɵfac = function TestCmp_Factory(t) { return new (t || TestCmp)(); };
  TestCmp.ɵcmp = i0.ɵɵdefineComponent({ type: TestCmp, selectors: [["test-cmp"]], standalone: true, features: [i0.ɵɵStandaloneFeature], decls: 3, vars: 0, template: function TestCmp_Template(rf, ctx) { }, encapsulation: 2 });
  (function () {
    (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadataAsync(TestCmp,
      function () { return [import("./cmp-a").then(function (m) { return m.CmpA; })]; },
      function (CmpA) { i0.ɵsetClassMetadata(TestCmp, [{
          type: Component,
          args: [{
            selector: 'test-cmp',
            standalone: true,
            imports: [CmpA],
            template: '{#defer}<cmp-a />{/defer}',
          }]
      }], null, null); }); })();
`;

const inputAsyncArrowFn = tags.stripIndent`
  export class TestCmp {
  }
  TestCmp.ɵfac = function TestCmp_Factory(t) { return new (t || TestCmp)(); };
  TestCmp.ɵcmp = i0.ɵɵdefineComponent({ type: TestCmp, selectors: [["test-cmp"]], standalone: true, features: [i0.ɵɵStandaloneFeature], decls: 3, vars: 0, template: function TestCmp_Template(rf, ctx) { }, encapsulation: 2 });
  (() => {
    (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadataAsync(TestCmp,
      () => [import("./cmp-a").then((m) => m.CmpA)],
      (CmpA) => {
        i0.ɵsetClassMetadata(TestCmp, [{
          type: Component,
          args: [{
            selector: 'test-cmp',
            standalone: true,
            imports: [CmpA],
            template: '{#defer}<cmp-a />{/defer}',
          }]
        }], null, null);
      }); })();
`;

const inputDebugInfo = tags.stripIndent`
  import { Component } from '@angular/core';
  import * as i0 from "@angular/core";
  export class TestCmp {
  }
  TestCmp.ɵfac = function TestCmp_Factory(t) { return new (t || TestCmp)(); };
  TestCmp.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TestCmp, selectors: [["test-cmp"]], decls: 0, vars: 0, template: function TestCmp_Template(rf, ctx) { }, encapsulation: 2 });
  (() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TestCmp, { className: "TestCmp" }); })();
`;

describe('@ngtools/webpack transformers', () => {
  describe('remove-ivy-dev-calls', () => {
    it('should allow removing only set class metadata with pure annotation', () => {
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

      const result = transform(input, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, false, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

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

      const result = transform(inputNoPure, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, false, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should allow removing only ng module scope with pure annotation', () => {
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

      const result = transform(input, (getTypeChecker) =>
        removeIvyJitSupportCalls(false, true, false, getTypeChecker),
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
        (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadata(AppModule, [{
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

      const result = transform(inputNoPure, (getTypeChecker) =>
        removeIvyJitSupportCalls(false, true, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should allow removing both set class metadata and ng module scope with pure annotation', () => {
      const output = tags.stripIndent`
        export class AppModule {
        }
        AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
                    BrowserModule,
                    AppRoutingModule
                ]] });
      `;

      const result = transform(input, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, true, false, getTypeChecker),
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

      const result = transform(inputNoPure, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, true, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should allow removing neither set class metadata nor ng module scope with pure annotation', () => {
      const result = transform(input, (getTypeChecker) =>
        removeIvyJitSupportCalls(false, false, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${input}`);
    });

    it('should allow removing neither set class metadata nor ng module scope', () => {
      const result = transform(inputNoPure, (getTypeChecker) =>
        removeIvyJitSupportCalls(false, false, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${inputNoPure}`);
    });

    it('should strip unused imports when removing set class metadata and ng module scope with pure annotation', () => {
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

      const result = transform(imports + input, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, true, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
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

      const result = transform(imports + inputNoPure, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, true, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should remove setClassMetadata and setNgModuleScope calls inside arrow-function-based IIFEs that have bodies', () => {
      const output = tags.stripIndent`
        export class AppModule {
        }
        AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
                    BrowserModule,
                    AppRoutingModule
                ]] });
      `;

      const result = transform(inputArrowFnWithBody, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, true, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should remove setClassMetadata and setNgModuleScope calls inside arrow-function-based IIFEs that have an implicit return', () => {
      const output = tags.stripIndent`
        export class AppModule {
        }
        AppModule.ɵmod = i0.ɵɵdefineNgModule({ type: AppModule, bootstrap: [AppComponent] });
        AppModule.ɵinj = i0.ɵɵdefineInjector({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [], imports: [[
                    BrowserModule,
                    AppRoutingModule
                ]] });
      `;

      const result = transform(inputArrowFnWithImplicitReturn, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, true, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should remove setClassMetadataAsync calls', () => {
      const output = tags.stripIndent`
        export class TestCmp {
        }
        TestCmp.ɵfac = function TestCmp_Factory(t) { return new (t || TestCmp)(); };
        TestCmp.ɵcmp = i0.ɵɵdefineComponent({ type: TestCmp, selectors: [["test-cmp"]], standalone: true, features: [i0.ɵɵStandaloneFeature], decls: 3, vars: 0, template: function TestCmp_Template(rf, ctx) { }, encapsulation: 2 });
      `;

      const result = transform(inputAsync, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, false, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should remove arrow-function-based setClassMetadataAsync calls', () => {
      const output = tags.stripIndent`
        export class TestCmp {
        }
        TestCmp.ɵfac = function TestCmp_Factory(t) { return new (t || TestCmp)(); };
        TestCmp.ɵcmp = i0.ɵɵdefineComponent({ type: TestCmp, selectors: [["test-cmp"]], standalone: true, features: [i0.ɵɵStandaloneFeature], decls: 3, vars: 0, template: function TestCmp_Template(rf, ctx) { }, encapsulation: 2 });
      `;

      const result = transform(inputAsyncArrowFn, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, false, false, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });

    it('should remove setClassDebugInfo calls', () => {
      const output = tags.stripIndent`
        import * as i0 from "@angular/core";
        export class TestCmp { }
        TestCmp.ɵfac = function TestCmp_Factory(t) { return new (t || TestCmp)(); };
        TestCmp.ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TestCmp, selectors: [["test-cmp"]], decls: 0, vars: 0, template: function TestCmp_Template(rf, ctx) { }, encapsulation: 2 });
      `;

      const result = transform(inputDebugInfo, (getTypeChecker) =>
        removeIvyJitSupportCalls(true, false, true, getTypeChecker),
      );

      expect(tags.oneLine`${result}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
