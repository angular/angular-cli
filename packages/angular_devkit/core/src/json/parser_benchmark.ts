/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {parseJson, parseJsonAst} from './parser';
import {benchmark} from '@_/benchmark';


const testCase = {
  'hello': [0, 1, 'world', 2],
  'world': {
    'great': 123E-12
  },
};
const testCaseJson = JSON.stringify(testCase);


describe('parserJson', () => {
  benchmark('parseJsonAst', () => parseJsonAst(testCaseJson), () => JSON.parse(testCaseJson));
  benchmark('parseJson', () => parseJson(testCaseJson));
});
