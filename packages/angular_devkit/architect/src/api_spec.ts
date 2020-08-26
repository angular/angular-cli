/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Target, targetFromTargetString, targetStringFromTarget } from './api';

describe('Architect API', () => {
  const goldens: { [t: string]: Target } = {
    'a:b:c': { project: 'a', target: 'b', configuration: 'c' },
    'a:b': { project: 'a', target: 'b' },
    ':b': { project: '', target: 'b' },
    ':b:c': { project: '', target: 'b', configuration: 'c' },
    ':': { project: '', target: '' },
    '::': { project: '', target: '', configuration: '' },
    'a:b:': { project: 'a', target: 'b', configuration: '' },
    'a::c': { project: 'a', target: '', configuration: 'c' },
    'a:b:c:': { project: 'a', target: 'b', configuration: 'c' },
    'a:b:c:d': { project: 'a', target: 'b', configuration: 'c' },
    'a:b:c:d:': { project: 'a', target: 'b', configuration: 'c' },
  };

  describe('targetFromTargetString', () => {
    for (const ts of Object.getOwnPropertyNames(goldens)) {
      const t: Target = goldens[ts];
      it(`works for ${JSON.stringify(ts)}`, () => {
        expect(targetFromTargetString(ts)).toEqual(t);
      });
    }
    it('errors out for invalid strings', () => {
      expect(() => targetFromTargetString('')).toThrow();
      expect(() => targetFromTargetString('a')).toThrow();
    });
  });

  describe('targetStringFromTarget', () => {
    for (const ts of Object.getOwnPropertyNames(goldens)) {
      const t: Target = goldens[ts];

      it(`works for ${JSON.stringify(t)}`, () => {
        // We have some invalid goldens. Remove everything after the second :.
        const goldenTs = ts.replace(/(\w+:\w+(:\w*)?).*/, '$1');
        expect(targetStringFromTarget(t)).toEqual(goldenTs);
      });
    }
  });
});
