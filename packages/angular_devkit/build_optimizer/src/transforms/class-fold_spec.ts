import { oneLine, stripIndent } from 'common-tags';

import { transformJavascript } from '../helpers/transform-javascript';
import { getFoldFileTransformer } from './class-fold';


const transform = (content: string) => transformJavascript(
  { content, getTransforms: [getFoldFileTransformer] }).content;

describe('class-fold', () => {
  it('folds static properties into class', () => {
    const staticProperty = 'Clazz.prop = 1;';
    const input = stripIndent`
      var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${staticProperty}
    `;
    const output = stripIndent`
      var Clazz = (function () { function Clazz() { }
      ${staticProperty} return Clazz; }());
    `;

    expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
  });

  it('folds multiple static properties into class', () => {
    const staticProperty = 'Clazz.prop = 1;';
    const anotherStaticProperty = 'Clazz.anotherProp = 2;';
    const input = stripIndent`
      var Clazz = (function () { function Clazz() { } return Clazz; }());
      ${staticProperty}
      ${anotherStaticProperty}
    `;
    const output = stripIndent`
      var Clazz = (function () { function Clazz() { }
      ${staticProperty} ${anotherStaticProperty} return Clazz; }());
    `;

    expect(oneLine`${transform(input)}`).toEqual(oneLine`${output}`);
  });
});
