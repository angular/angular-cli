/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Hooks } from '../src/hooks';

describe('Hooks', () => {
  let hooks: Hooks & { run: Function };

  beforeEach(() => {
    hooks = new Hooks() as Hooks & { run: Function };
  });

  describe('on', () => {
    it('should register a pre-transform hook', () => {
      hooks.on('html:transform:pre', (ctx) => '');
      expect(hooks.has('html:transform:pre')).toBeTrue();
    });

    it('should register multiple hooks under the same name', () => {
      hooks.on('html:transform:pre', (ctx) => '');
      hooks.on('html:transform:pre', (ctx) => '');
      expect(hooks.has('html:transform:pre')).toBeTrue();
    });
  });

  describe('run', () => {
    it('should execute pre-transform hooks in sequence', async () => {
      hooks.on('html:transform:pre', ({ html }) => html + '1');
      hooks.on('html:transform:pre', ({ html }) => html + '2');

      const result = await hooks.run('html:transform:pre', { html: 'start' });
      expect(result).toBe('start12');
    });

    it('should return the context html if no hooks are registered', async () => {
      const result = await hooks.run('html:transform:pre', { html: 'start' });
      expect(result).toBe('start');
    });

    it('should throw an error for unknown hook names', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expectAsync(hooks.run('unknown:hook' as any, { html: 'start' })).toBeRejectedWithError(
        'Running hook "unknown:hook" is not supported.',
      );
    });
  });

  describe('has', () => {
    it('should return true if a hook is registered', () => {
      const handler = (ctx: { html: string }) => '';
      hooks.on('html:transform:pre', handler);
      expect(hooks.has('html:transform:pre')).toBeTrue();
    });

    it('should return false if no hook is registered', () => {
      expect(hooks.has('html:transform:pre')).toBeFalse();
    });
  });
});
