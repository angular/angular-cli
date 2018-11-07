/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { Arguments, Option, OptionType } from './interface';
import { ParseArgumentException, parseArguments } from './parser';

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
    { name: 'p3', positional: 2, aliases: [], type: OptionType.Number, description: '' },
    { name: 't1', aliases: [], type: OptionType.Boolean,
      types: [OptionType.Boolean, OptionType.String], description: '' },
    { name: 't2', aliases: [], type: OptionType.Boolean,
      types: [OptionType.Boolean, OptionType.Number], description: '' },
    { name: 't3', aliases: [], type: OptionType.Number,
      types: [OptionType.Number, OptionType.Any], description: '' },
    { name: 'e1', aliases: [], type: OptionType.String, enum: ['hello', 'world'], description: '' },
    { name: 'e2', aliases: [], type: OptionType.String, enum: ['hello', ''], description: '' },
    { name: 'e3', aliases: [], type: OptionType.Boolean,
      types: [OptionType.Boolean, OptionType.String], enum: ['json', true, false],
      description: '' },
  ];

  const tests: { [test: string]: Partial<Arguments> | ['!!!', Partial<Arguments>, string[]] } = {
    '--bool': { bool: true },
    '--bool=1': ['!!!', {}, ['--bool=1']],
    '--bool  ': { bool: true, p1: '' },
    '-- --bool=1': { '--': ['--bool=1'] },
    '--bool=yellow': ['!!!', {}, ['--bool=yellow']],
    '--bool=true': { bool: true },
    '--bool=false': { bool: false },
    '--no-bool': { bool: false },
    '--no-bool=true': { '--': ['--no-bool=true'] },
    '--b=true': { bool: true },
    '--b=false': { bool: false },
    '--b true': { bool: true },
    '--b false': { bool: false },
    '--bool --num': { bool: true, num: 0 },
    '--bool --num=true': ['!!!', { bool: true }, ['--num=true']],
    '-- --bool --num=true': { '--': ['--bool', '--num=true'] },
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
    '--bool val1 --etc --num val2 --v': [
      '!!!',
      { bool: true, p1: 'val1', p2: 'val2', '--': ['--etc', '--v'] },
      ['--num' ],
    ],
    '--bool val1 --etc --num=1 val2 --v': { bool: true, num: 1, p1: 'val1', p2: 'val2',
                                            '--': ['--etc', '--v'] },
    '--arr=a --arr=b --arr c d': { arr: ['a', 'b', 'c'], p1: 'd' },
    '--arr=1 --arr --arr c d': { arr: ['1', '', 'c'], p1: 'd' },
    '--arr=1 --arr --arr c d e': { arr: ['1', '', 'c'], p1: 'd', p2: 'e' },
    '--str=1': { str: '1' },
    '--str=': { str: '' },
    '--str ': { str: '' },
    '--str  ': { str: '', p1: '' },
    '--str    ': { str: '', p1: '', p2: '', '--': [''] },
    '--hello-world=1': { helloWorld: '1' },
    '--hello-bool': { helloBool: true },
    '--helloBool': { helloBool: true },
    '--no-helloBool': { helloBool: false },
    '--noHelloBool': { helloBool: false },
    '--noBool': { bool: false },
    '-b': { bool: true },
    '-b=true': { bool: true },
    '-sb': { bool: true, str: '' },
    '-s=b': { str: 'b' },
    '-bs': { bool: true, str: '' },
    '--t1=true': { t1: true },
    '--t1': { t1: true },
    '--t1 --num': { t1: true, num: 0 },
    '--no-t1': { t1: false },
    '--t1=yellow': { t1: 'yellow' },
    '--no-t1=true': { '--': ['--no-t1=true'] },
    '--t1=123': { t1: '123' },
    '--t2=true': { t2: true },
    '--t2': { t2: true },
    '--no-t2': { t2: false },
    '--t2=yellow': ['!!!', {}, ['--t2=yellow']],
    '--no-t2=true': { '--': ['--no-t2=true'] },
    '--t2=123': { t2: 123 },
    '--t3=a': { t3: 'a' },
    '--t3': { t3: 0 },
    '--t3 true': { t3: true },
    '--e1 hello': { e1: 'hello' },
    '--e1=hello': { e1: 'hello' },
    '--e1 yellow': ['!!!', { p1: 'yellow' }, ['--e1']],
    '--e1=yellow': ['!!!', {}, ['--e1=yellow']],
    '--e1': ['!!!', {}, ['--e1']],
    '--e1 true': ['!!!', { p1: 'true' }, ['--e1']],
    '--e1=true': ['!!!', {},  ['--e1=true']],
    '--e2 hello': { e2: 'hello' },
    '--e2=hello': { e2: 'hello' },
    '--e2 yellow': { p1: 'yellow', e2: '' },
    '--e2=yellow': ['!!!', {}, ['--e2=yellow']],
    '--e2': { e2: '' },
    '--e2 true': { p1: 'true', e2: '' },
    '--e2=true': ['!!!', {}, ['--e2=true']],
    '--e3 json': { e3: 'json' },
    '--e3=json': { e3: 'json' },
    '--e3 yellow': { p1: 'yellow', e3: true },
    '--e3=yellow': ['!!!', {}, ['--e3=yellow']],
    '--e3': { e3: true },
    '--e3 true': { e3: true },
    '--e3=true': { e3: true },
    'a b c 1': { p1: 'a', p2: 'b', '--': ['c', '1'] },

    '-p=1 -c=prod': {'--': ['-p=1', '-c=prod'] },
    '--p --c': {'--': ['--p', '--c'] },
    '--p=123': {'--': ['--p=123'] },
    '--p -c': {'--': ['--p', '-c'] },
    '-p --c': {'--': ['-p', '--c'] },
    '-p --c 123': {'--': ['-p', '--c', '123'] },
    '--c 123 -p': {'--': ['--c', '123', '-p'] },
  };

  Object.entries(tests).forEach(([str, expected]) => {
    it(`works for ${str}`, () => {
      try {
        const actual = parseArguments(str.split(' '), options);

        expect(Array.isArray(expected)).toBe(false);
        expect(actual).toEqual(expected as Arguments);
      } catch (e) {
        if (!(e instanceof ParseArgumentException)) {
          throw e;
        }

        // The expected values are an array.
        expect(Array.isArray(expected)).toBe(true);
        expect(e.parsed).toEqual(expected[1] as Arguments);
        expect(e.ignored).toEqual(expected[2] as string[]);
      }
    });
  });
});
