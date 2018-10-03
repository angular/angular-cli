/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { benchmark } from '@_/benchmark';
import { join, noCacheNormalize, normalize, resetNormalizeCache } from './path';

const seedrandom = require('seedrandom');


const p1 = '/b/././a/tt/../../../a/b/./d/../c';
const p2 = '/a/tt/../../../a/b/./d';


const numRandomIter = 10000;


describe('Virtual FS Path', () => {
  benchmark('join', () => join(normalize(p1), p2));

  describe('normalize', () => {
    let rng: () => number;
    let cases: string[];

    // Math.random() doesn't allow us to set a seed, so we use a library.
    beforeEach(() => {
      rng = seedrandom('some fixed value');

      function _str(len: number) {
        let r = '';
        const space = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < len; i++) {
          r += space[Math.floor(rng() * space.length)];
        }

        return r;
      }

      // Build test cases.
      cases = new Array(numRandomIter)
        .fill(0)
        .map(() => {
          return new Array(Math.floor(rng() * 20 + 5))
            .fill(0)
            .map(() => _str(rng() * 20 + 3))
            .join('/');
        });

      resetNormalizeCache();
    });

    describe('random (0 cache hits)', () => {
      benchmark('', i => normalize(cases[i]), i => noCacheNormalize(cases[i]));
    });

    describe('random (10% cache hits)', () => {
      beforeEach(() => {
        cases = cases.map(x => (rng() < 0.1) ? cases[0] : x);
      });
      benchmark('', i => normalize(cases[i]), i => noCacheNormalize(cases[i]));
    });

    describe('random (30% cache hits)', () => {
      beforeEach(() => {
        cases = cases.map(x => (rng() < 0.3) ? cases[0] : x);
      });
      benchmark('', i => normalize(cases[i]), i => noCacheNormalize(cases[i]));
    });

    describe('random (50% cache hits)', () => {
      beforeEach(() => {
        cases = cases.map(x => (rng() < 0.5) ? cases[0] : x);
      });
      benchmark('', i => normalize(cases[i]), i => noCacheNormalize(cases[i]));
    });

    describe('random (80% cache hits)', () => {
      beforeEach(() => {
        cases = cases.map(x => (rng() < 0.8) ? cases[0] : x);
      });
      benchmark('', i => normalize(cases[i]), i => noCacheNormalize(cases[i]));
    });
  });
});
