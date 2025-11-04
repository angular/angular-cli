/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from './test-helpers';

describe('Jasmine to Vitest Transformer', () => {
  describe('addImports option', () => {
    it('should add value imports when addImports is true', async () => {
      const input = `spyOn(foo, 'bar');`;
      const expected = `
        import { vi } from 'vitest';
        vi.spyOn(foo, 'bar');
      `;
      await expectTransformation(input, expected, true);
    });

    it('should generate a single, combined import for value and type imports when addImports is true', async () => {
      const input = `
        let mySpy: jasmine.Spy;
        spyOn(foo, 'bar');
      `;
      const expected = `
        import { type Mock, vi } from 'vitest';

        let mySpy: Mock;
        vi.spyOn(foo, 'bar');
      `;
      await expectTransformation(input, expected, true);
    });

    it('should only add type imports when addImports is false', async () => {
      const input = `
        let mySpy: jasmine.Spy;
        spyOn(foo, 'bar');
      `;
      const expected = `
        import type { Mock } from 'vitest';

        let mySpy: Mock;
        vi.spyOn(foo, 'bar');
      `;
      await expectTransformation(input, expected, false);
    });

    it('should not add an import if no Vitest APIs are used, even when addImports is true', async () => {
      const input = `const a = 1;`;
      const expected = `const a = 1;`;
      await expectTransformation(input, expected, true);
    });

    it('should add imports for top-level describe and it when addImports is true', async () => {
      const input = `
        describe('My Suite', () => {
          it('should do something', () => {
            // test content
          });
        });
      `;
      const expected = `
        import { describe, it } from 'vitest';

        describe('My Suite', () => {
          it('should do something', () => {
            // test content
          });
        });
      `;
      await expectTransformation(input, expected, true);
    });

    it('should add imports for top-level expect when addImports is true', async () => {
      const input = `expect(true).toBe(true);`;
      const expected = `
        import { expect } from 'vitest';
        expect(true).toBe(true);
      `;
      await expectTransformation(input, expected, true);
    });
  });
});
