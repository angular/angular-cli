/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { tags } from '@angular-devkit/core';
import { transformJavascript } from '../helpers/transform-javascript';
import { getPrefixFunctionsTransformer } from './prefix-functions';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getPrefixFunctionsTransformer] }).content;

describe('prefix-functions', () => {
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('pure functions', () => {
    it('adds comment to new calls', () => {
      const input = tags.stripIndent`
        var newClazz = new Clazz();
      `;
      const output = tags.stripIndent`
        var newClazz = /*@__PURE__*/ new Clazz();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('adds comment to function calls', () => {
      const input = tags.stripIndent`
        var newClazz = Clazz();
      `;
      const output = tags.stripIndent`
        var newClazz = /*@__PURE__*/ Clazz();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('adds comment outside of IIFEs', () => {
      const input = tags.stripIndent`
        ${clazz}
        var ClazzTwo = (function () { function Clazz() { } return Clazz; })();
      `;
      const output = tags.stripIndent`
        var Clazz = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; }());
        var ClazzTwo = /*@__PURE__*/ (function () { function Clazz() { } return Clazz; })();
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t add comment when inside function declarations or expressions', () => {
      const input = tags.stripIndent`
        function funcDecl() {
          var newClazz = Clazz();
          var newClazzTwo = new Clazz();
        }

        var funcExpr = function () {
          var newClazz = Clazz();
          var newClazzTwo = new Clazz();
        };
      `;
      const output = tags.stripIndent`
        ${input}
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t add comment to downlevel namespaces', () => {
      const input = tags.stripIndent`
        function MyFunction() { }

        (function (MyFunction) {
            function subFunction() { }
            MyFunction.subFunction = subFunction;
        })(MyFunction || (MyFunctionn = {}));

        export { MyFunction };
      `;
      const output = tags.stripIndent`
        ${input}
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t add comment when inside class', () => {
      const input = tags.stripIndent`
        class Foo {
          constructor(e) {
            super(e);
          }
          method() {
            var newClazz = new Clazz();
          }
        }
      `;
      const output = tags.stripIndent`
        ${input}
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t add comment when inside arrow function', () => {
      const input = tags.stripIndent`
        export const subscribeToArray = (array) => (subscriber) => {
            for (let i = 0, len = array.length; i < len && !subscriber.closed; i++) {
                subscriber.next(array[i]);
            }
            if (!subscriber.closed) {
                subscriber.complete();
            }
        };
      `;
      const output = tags.stripIndent`
        ${input}
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('doesn\'t add comment when inside object literal method', () => {
      const input = tags.stripIndent`
        const literal = {
          method() {
            var newClazz = new Clazz();
          }
        };
      `;
      const output = tags.stripIndent`
        ${input}
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
