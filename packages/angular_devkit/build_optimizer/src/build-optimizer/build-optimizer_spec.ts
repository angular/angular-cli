import { oneLine } from 'common-tags';
import { RawSourceMap } from 'source-map';

import { buildOptimizer } from './build-optimizer';


describe('build-optimizer', () => {
  const imports = 'import { Injectable, Input } from \'@angular/core\';';
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';
  const staticProperty = 'Clazz.prop = 1;';
  const decorators = 'Clazz.decorators = [ { type: Injectable } ];';

  describe('basic functionality', () => {
    it('applies class-fold, scrub-file and prefix-functions', () => {
      const input = oneLine`
        ${imports}
        var __extends = (this && this.__extends) || function (d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          function __() { this.constructor = d; }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
        ${clazz}
        ${staticProperty}
        ${decorators}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
        Clazz.ctorParameters = function () { return [{type: Injector}]; };
      `;
      // tslint:disable:max-line-length
      const output = oneLine`
        /** PURE_IMPORTS_START _angular_core,tslib PURE_IMPORTS_END */
        ${imports}
        import { __extends } from "tslib";
        var Clazz = /*@__PURE__*/ (function () { function Clazz() { } ${staticProperty} return Clazz; }());
      `;
      // tslint:enable:max-line-length

      expect(oneLine`${buildOptimizer({ content: input }).content}`).toEqual(output);
    });

    it('doesn\'t process files without decorators/ctorParameters', () => {
      const input = oneLine`
        var Clazz = (function () { function Clazz() { } return Clazz; }());
        ${staticProperty}
      `;

      expect(oneLine`${buildOptimizer({ content: input }).content}`).toEqual(input);
    });
  });


  describe('resilience', () => {
    it('doesn\'t process files with invalid syntax by default', () => {
      const input = oneLine`
        ))))invalid syntax
        ${clazz}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(oneLine`${buildOptimizer({ content: input }).content}`).toEqual(input);
    });

    it('throws on files with invalid syntax in strict mode', () => {
      const input = oneLine`
        ))))invalid syntax
        ${clazz}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(() => buildOptimizer({ content: input, strict: true })).toThrow();
    });
  });

  describe('sourcemaps', () => {
    const transformableInput = oneLine`
      ${imports}
      ${clazz}
      ${decorators}
    `;

    it('doesn\'t produce sourcemaps by default', () => {
      expect(buildOptimizer({ content: transformableInput }).sourceMap).toBeFalsy();
    });

    it('produces sourcemaps', () => {
      const ignoredInput = oneLine`
        var Clazz = (function () { function Clazz() { } return Clazz; }());
        ${staticProperty}
      `;
      expect(buildOptimizer({ content: ignoredInput, emitSourceMap: true }).sourceMap).toBeTruthy();
      expect(buildOptimizer(
        { content: transformableInput, emitSourceMap: true },
      ).sourceMap).toBeTruthy();
    });

    it('produces sourcemaps for ignored files', () => {
      const ignoredInput = oneLine`
        var Clazz = (function () { function Clazz() { } return Clazz; }());
        ${staticProperty}
      `;
      expect(buildOptimizer({ content: ignoredInput, emitSourceMap: true }).sourceMap).toBeTruthy();
      expect(buildOptimizer(
        { content: transformableInput, emitSourceMap: true },
      ).sourceMap).toBeTruthy();
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
      const inputFilePath = 'file.js';
      const outputFilePath = 'file.bo.js';
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
