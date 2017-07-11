import { oneLine, stripIndent } from 'common-tags';

import { transformJavascript } from '../helpers/transform-javascript';
import { getPrefixFunctionsTransformer } from './prefix-functions';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getPrefixFunctionsTransformer] }).content;

describe('prefix-functions', () => {
  const emptyImportsComment = '/** PURE_IMPORTS_START PURE_IMPORTS_END */';
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('pure imports', () => {
    it('adds import list', () => {
      const input = stripIndent`
        import { Injectable } from '@angular/core';
        var foo = Injectable;
      `;
      const output = stripIndent`
        /** PURE_IMPORTS_START _angular_core PURE_IMPORTS_END */
        ${input}
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('adds import list even with no imports', () => {
      const input = stripIndent`
        var foo = 42;
      `;
      const output = stripIndent`
        ${emptyImportsComment}
        ${input}
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });
  });

  describe('pure functions', () => {
    it('adds comment to new calls', () => {
      const input = stripIndent`
        var newClazz = new Clazz();
      `;
      const output = stripIndent`
        ${emptyImportsComment}
        var newClazz = /*@__PURE__*/ new Clazz();
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('adds comment to function calls', () => {
      const input = stripIndent`
        var newClazz = Clazz();
      `;
      const output = stripIndent`
        ${emptyImportsComment}
        var newClazz = /*@__PURE__*/ Clazz();
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('adds comment outside of IIFEs', () => {
      const input = stripIndent`
        ${clazz}
        var ClazzTwo = (function () { function Clazz() { } return Clazz; })();
      `;
      const output = stripIndent`
        ${emptyImportsComment}
        var Clazz = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; }());
        var ClazzTwo = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; })();
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });

    it('doesn\'t adds comment when inside function declarations or expressions', () => {
      const input = stripIndent`
        function funcDecl() {
          var newClazz = Clazz();
          var newClazzTwo = new Clazz();
        }

        var funcExpr = function () {
          var newClazz = Clazz();
          var newClazzTwo = new Clazz();
        };
      `;
      const output = stripIndent`
        ${emptyImportsComment}
        ${input}
      `;

      expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
    });
  });
});
