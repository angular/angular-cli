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
import { getFoldFileTransformer } from './class-fold';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getFoldFileTransformer], typeCheck: true }).content;

describe('class-fold', () => {
  it('folds static properties into class', () => {
    const staticProperty = 'Clazz.prop = 1;';
    const input = tags.stripIndent`
      var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${staticProperty}
    `;
    const output = tags.stripIndent`
      var Clazz = (function () { function Clazz() { }
      ${staticProperty} return Clazz; }());
    `;

    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });

  it('folds multiple static properties into class', () => {
    const staticProperty = 'Clazz.prop = 1;';
    const anotherStaticProperty = 'Clazz.anotherProp = 2;';
    const input = tags.stripIndent`
      var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${staticProperty}
      ${anotherStaticProperty}
    `;
    const output = tags.stripIndent`
      var Clazz = (function () { function Clazz() { }
      ${staticProperty} ${anotherStaticProperty} return Clazz; }());
    `;

    expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
  });
});
