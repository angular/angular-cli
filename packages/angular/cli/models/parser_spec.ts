/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { Arguments, Option, OptionType } from './interface';
import { parseArguments } from './parser';

describe('parseArguments', () => {
  const options: Option[] = [
    { name: 'bool', aliases: [ 'b' ], type: OptionType.Boolean, description: '' },
    { name: 'num', aliases: [ 'n' ], type: OptionType.Number, description: '' },
    { name: 'str', aliases: [ 's' ], type: OptionType.String, description: '' },
    { name: 'helloWorld', aliases: [], type: OptionType.String, description: '' },
    { name: 'helloBool', aliases: [], type: OptionType.Boolean, description: '' },
    { name: 'arr', aliases: [ 'a' ], type: OptionType.Array, description: '' },
    { name: 'p1', positional: 0, aliases: [], type: OptionType.String, description: '' },
    { name: 'p2', positional: 1, aliases: [], type: OptionType.String, description: '' },
  ];

  const tests: { [test: string]: Partial<Arguments> } = {
    '--bool': { bool: true },
    '--bool=1': { bool: true },
    '--bool=true': { bool: true },
    '--bool=false': { bool: false },
    '--no-bool': { bool: false },
    '--no-bool=true': { '--': ['--no-bool=true'] },
    '--b=true': { bool: true },
    '--b=false': { bool: false },
    '--b true': { bool: true },
    '--b false': { bool: false },
    '--bool --num': { bool: true, num: 0 },
    '--bool --num=true': { bool: true },
    '--bool=true --num': { bool: true, num: 0 },
    '--bool true --num': { bool: true, num: 0 },
    '--bool=false --num': { bool: false, num: 0 },
    '--bool false --num': { bool: false, num: 0 },
    '--str false --num': { str: 'false', num: 0 },
    '--str=false --num': { str: 'false', num: 0 },
    '--str=false --num1': { str: 'false', '--': ['--num1'] },
    '--str=false val1 --num1': { str: 'false', p1: 'val1', '--': ['--num1'] },
    '--str=false val1 val2': { str: 'false', p1: 'val1', p2: 'val2' },
    '--str=false val1 val2 --num1': { str: 'false', p1: 'val1', p2: 'val2', '--': ['--num1'] },
    '--str=false val1 --num1 val2': { str: 'false', p1: 'val1', '--': ['--num1', 'val2'] },
    'val1 --num=1 val2': { num: 1, p1: 'val1', p2: 'val2' },
    '--p1=val1 --num=1 val2': { num: 1, p1: 'val1', p2: 'val2' },
    '--p1=val1 --num=1 --p2=val2 val3': { num: 1, p1: 'val1', p2: 'val2', '--': ['val3'] },
    '--bool val1 --etc --num val2 --v': { bool: true, num: 0, p1: 'val1', p2: 'val2',
                                          '--': ['--etc', '--v'] },
    '--arr=a --arr=b --arr c d': { arr: ['a', 'b', 'c'], p1: 'd' },
    '--arr=1 --arr --arr c d': { arr: ['1', '--arr'], p1: 'c', p2: 'd' },
    '--str=1': { str: '1' },
    '--hello-world=1': { helloWorld: '1' },
    '--hello-bool': { helloBool: true },
    '--helloBool': { helloBool: true },
    '--no-helloBool': { helloBool: false },
    '--noHelloBool': { helloBool: false },
    '-b': { bool: true },
    '-sb': { bool: true, str: '' },
    '-bs': { bool: true, str: '' },
  };

  Object.entries(tests).forEach(([str, expected]) => {
    it(`works for ${str}`, () => {
      const actual = parseArguments(str.split(/\s+/), options);

      expect(actual).toEqual(expected as Arguments);
    });
  });
});
