/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('Jasmine to Vitest Transformer', () => {
  describe('transformJasmineTypes', () => {
    const testCases = [
      {
        description: 'should transform a variable with a jasmine.Spy type',
        input: `let mySpy: jasmine.Spy;`,
        expected: `
          import type { Mock } from 'vitest';
          let mySpy: Mock;
        `,
      },
      {
        description: 'should transform a variable with a jasmine.SpyObj type',
        input: `let mySpy: jasmine.SpyObj<MyService>;`,
        expected: `
          import type { MockedObject } from 'vitest';
          let mySpy: MockedObject<MyService>;
        `,
      },
      {
        description: 'should handle multiple jasmine types and create a single import',
        input: `
          let mySpy: jasmine.Spy;
          let mySpyObj: jasmine.SpyObj<MyService>;
        `,
        expected: `
          import type { Mock, MockedObject } from 'vitest';

          let mySpy: Mock;
          let mySpyObj: MockedObject<MyService>;
        `,
      },
      {
        description: 'should not add an import if no jasmine types are used',
        input: `let mySpy: any;`,
        expected: `let mySpy: any;`,
      },
      {
        description: 'should transform jasmine.Any to any',
        input: `let myMatcher: jasmine.Any;`,
        expected: `let myMatcher: any;`,
      },
      {
        description: 'should transform jasmine.ObjectContaining<T> to Partial<T>',
        input: `let myMatcher: jasmine.ObjectContaining<MyService>;`,
        expected: `let myMatcher: Partial<MyService>;`,
      },
      {
        description: 'should transform jasmine.ObjectContaining to object',
        input: `let myMatcher: jasmine.ObjectContaining;`,
        expected: `let myMatcher: object;`,
      },
      {
        description: 'should transform jasmine.DoneFn to () => void',
        input: `let myDoneFn: jasmine.DoneFn;`,
        expected: `let myDoneFn: () => void;`,
      },
    ];

    testCases.forEach(({ description, input, expected }) => {
      it(description, async () => {
        await expectTransformation(input, expected);
      });
    });
  });
});
