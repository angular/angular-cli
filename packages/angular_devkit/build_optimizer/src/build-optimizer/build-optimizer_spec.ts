/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { tags } from '@angular-devkit/core';
import { RawSourceMap } from 'source-map';
import { buildOptimizer } from './build-optimizer';


describe('build-optimizer', () => {
  const imports = 'import { Injectable, Input, Component } from \'@angular/core\';';
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';
  const staticProperty = 'Clazz.prop = 1;';
  const decorators = 'Clazz.decorators = [ { type: Injectable } ];';

  describe('basic functionality', () => {
    it('applies class-fold, scrub-file and prefix-functions to side-effect free modules', () => {
      const input = tags.stripIndent`
        ${imports}
        var __extends = (this && this.__extends) || function (d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
        var ChangeDetectionStrategy;
        (function (ChangeDetectionStrategy) {
          ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
          ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
        })(ChangeDetectionStrategy || (ChangeDetectionStrategy = {}));
        ${clazz}
        ${staticProperty}
        ${decorators}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
        Clazz.ctorParameters = function () { return [{type: Injectable}]; };
        var ComponentClazz = (function () {
          function ComponentClazz() { }
          __decorate([
            Input(),
            __metadata("design:type", Object)
          ], Clazz.prototype, "selected", void 0);
          ComponentClazz = __decorate([
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            }),
            __metadata("design:paramtypes", [Injectable])
          ], ComponentClazz);
          return ComponentClazz;
        }());
        var RenderType_MdOption = ɵcrt({ encapsulation: 2, styles: styles_MdOption});
      `;
      // tslint:disable:max-line-length
      const output = tags.oneLine`
        /** PURE_IMPORTS_START _angular_core,tslib PURE_IMPORTS_END */
        ${imports}
        import { __extends } from "tslib";
        var ChangeDetectionStrategy = /*@__PURE__*/ (function (ChangeDetectionStrategy) {
          ChangeDetectionStrategy[ChangeDetectionStrategy["OnPush"] = 0] = "OnPush";
          ChangeDetectionStrategy[ChangeDetectionStrategy["Default"] = 1] = "Default";
          return ChangeDetectionStrategy;
        })({});
        var Clazz = /*@__PURE__*/ (function () { function Clazz() { } ${staticProperty} return Clazz; }());
        var ComponentClazz = /*@__PURE__*/ (function () {
          function ComponentClazz() { }
          return ComponentClazz;
        }());
        var RenderType_MdOption = /*@__PURE__*/ ɵcrt({ encapsulation: 2, styles: styles_MdOption });
      `;

      // Check Angular 4/5 and unix/windows paths.
      const inputPaths = [
        '/node_modules/@angular/core/@angular/core.es5.js',
        '/node_modules/@angular/core/esm5/core.js',
        '\\node_modules\\@angular\\core\\@angular\\core.es5.js',
        '\\node_modules\\@angular\\core\\esm5\\core.js',
        '/project/file.ngfactory.js',
        '/project/file.ngstyle.js',
      ];

      inputPaths.forEach((inputFilePath) => {
        const boOutput = buildOptimizer({ content: input, inputFilePath });
        expect(tags.oneLine`${boOutput.content}`).toEqual(output);
        expect(boOutput.emitSkipped).toEqual(false);
      });
    });

    it('supports es2015 modules', () => {
      // prefix-functions would add PURE_IMPORTS_START and PURE to the super call.
      // This test ensures it isn't applied to es2015 modules.
      const output = tags.oneLine`
        import { Injectable } from '@angular/core';
        class Clazz extends BaseClazz { constructor(e) { super(e); } }
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.ctorParameters = () => [ { type: Injectable } ];
      `;

      const inputFilePath = '/node_modules/@angular/core/@angular/core.js';
      const boOutput = buildOptimizer({ content: input, inputFilePath });
      expect(tags.oneLine`${boOutput.content}`).toEqual(output);
      expect(boOutput.emitSkipped).toEqual(false);
    });

    it('supports flagging module as side-effect free', () => {
      const output = tags.oneLine`
        /** PURE_IMPORTS_START  PURE_IMPORTS_END */
        var RenderType_MdOption = /*@__PURE__*/ ɵcrt({ encapsulation: 2, styles: styles_MdOption });
      `;
      const input = tags.stripIndent`
        var RenderType_MdOption = ɵcrt({ encapsulation: 2, styles: styles_MdOption});
      `;

      const boOutput = buildOptimizer({ content: input, isSideEffectFree: true });
      expect(tags.oneLine`${boOutput.content}`).toEqual(output);
      expect(boOutput.emitSkipped).toEqual(false);
    });
  });


  describe('resilience', () => {
    it('doesn\'t process files with invalid syntax by default', () => {
      const input = tags.oneLine`
        ))))invalid syntax
        ${clazz}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      const boOutput = buildOptimizer({ content: input });
      expect(boOutput.content).toBeFalsy();
      expect(boOutput.emitSkipped).toEqual(true);
    });

    it('throws on files with invalid syntax in strict mode', () => {
      const input = tags.oneLine`
        ))))invalid syntax
        ${clazz}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(() => buildOptimizer({ content: input, strict: true })).toThrow();
    });
  });

  describe('whitelisted modules', () => {
    // This statement is considered pure by getPrefixFunctionsTransformer on whitelisted modules.
    const input = 'console.log(42);';
    const output = '/*@__PURE__*/ console.log(42);';

    it('should process whitelisted modules', () => {
      const inputFilePath = '/node_modules/@angular/core/@angular/core.es5.js';
      const boOutput = buildOptimizer({ content: input, inputFilePath });
      expect(boOutput.content).toContain(output);
      expect(boOutput.emitSkipped).toEqual(false);
    });

    it('should not process non-whitelisted modules', () => {
      const inputFilePath = '/node_modules/other-package/core.es5.js';
      const boOutput = buildOptimizer({ content: input, inputFilePath });
      expect(boOutput.emitSkipped).toEqual(true);
    });

    it('should not process non-whitelisted umd modules', () => {
      const inputFilePath = '/node_modules/other_lib/index.js';
      const boOutput = buildOptimizer({ content: input, inputFilePath });
      expect(boOutput.emitSkipped).toEqual(true);
    });
  });

  describe('sourcemaps', () => {
    const transformableInput = tags.oneLine`
      ${imports}
      ${clazz}
      ${decorators}
    `;

    it('doesn\'t produce sourcemaps by default', () => {
      expect(buildOptimizer({ content: transformableInput }).sourceMap).toBeFalsy();
    });

    it('produces sourcemaps', () => {
      expect(buildOptimizer(
        { content: transformableInput, emitSourceMap: true },
      ).sourceMap).toBeTruthy();
    });

    it('doesn\'t produce sourcemaps when emitting was skipped', () => {
      const ignoredInput = tags.oneLine`
        var Clazz = (function () { function Clazz() { } return Clazz; }());
        ${staticProperty}
      `;
      const invalidInput = tags.oneLine`
        ))))invalid syntax
        ${clazz}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      const ignoredOutput = buildOptimizer({ content: ignoredInput, emitSourceMap: true });
      expect(ignoredOutput.emitSkipped).toBeTruthy();
      expect(ignoredOutput.sourceMap).toBeFalsy();

      const invalidOutput = buildOptimizer({ content: invalidInput, emitSourceMap: true });
      expect(invalidOutput.emitSkipped).toBeTruthy();
      expect(invalidOutput.sourceMap).toBeFalsy();
    });

    it('emits sources content', () => {
      const sourceMap = buildOptimizer(
        { content: transformableInput, emitSourceMap: true },
      ).sourceMap as RawSourceMap;
      const sourceContent = sourceMap.sourcesContent as string[];
      expect(sourceContent[0]).toEqual(transformableInput);
    });

    it('uses empty strings if inputFilePath and outputFilePath is not provided', () => {
      const { content, sourceMap } = buildOptimizer(
        { content: transformableInput, emitSourceMap: true });

      if (!sourceMap) {
        throw new Error('sourceMap was not generated.');
      }
      expect(sourceMap.file).toEqual('');
      expect(sourceMap.sources[0]).toEqual('');
      expect(content).not.toContain(`sourceMappingURL`);
    });

    it('uses inputFilePath and outputFilePath if provided', () => {
      const inputFilePath = '/path/to/file.js';
      const outputFilePath = '/path/to/file.bo.js';
      const { content, sourceMap } = buildOptimizer({
        content: transformableInput,
        emitSourceMap: true,
        inputFilePath,
        outputFilePath,
      });

      if (!sourceMap) {
        throw new Error('sourceMap was not generated.');
      }
      expect(sourceMap.file).toEqual(outputFilePath);
      expect(sourceMap.sources[0]).toEqual(inputFilePath);
      expect(content).toContain(`sourceMappingURL=${outputFilePath}.map`);
    });
  });

});
