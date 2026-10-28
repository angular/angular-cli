/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
import { KarmaExecutor } from './executor';

describe('KarmaExecutor', () => {
  async function getWarnings(options: Record<string, unknown>): Promise<string[]> {
    const warn = jasmine.createSpy('warn');
    // The unsupported option warnings are logged before the build target is read, so stop there.
    const context = {
      logger: { warn },
      getTargetOptions: () => Promise.reject(new Error('stop')),
    } as unknown as BuilderContext;

    const executor = new KarmaExecutor(context, {
      setupFiles: [],
      coverage: { enabled: false },
      ...options,
    } as unknown as NormalizedUnitTestBuilderOptions);

    await expectAsync(executor.execute()[Symbol.asyncIterator]().next()).toBeRejectedWithError(
      'stop',
    );

    return warn.calls.allArgs().map(([message]) => message);
  }

  it('warns that the "providersFile" option is not supported', async () => {
    expect(await getWarnings({ providersFile: '/src/test-providers.ts' })).toContain(
      'The "karma" test runner does not support the "providersFile" option. The option will be ignored.',
    );
  });

  it('warns that the "outputFile" option is not supported', async () => {
    expect(await getWarnings({ outputFile: 'test-results.xml' })).toContain(
      'The "karma" test runner does not support the "outputFile" option. The option will be ignored.',
    );
  });

  it('warns that the "coverageReporters" option is not supported', async () => {
    expect(await getWarnings({ coverage: { enabled: true, reporters: [['lcov', {}]] } })).toContain(
      'The "karma" test runner does not support the "coverageReporters" option. The option will be ignored.',
    );
  });

  it('does not warn when no unsupported options are set', async () => {
    expect(await getWarnings({})).toEqual([]);
  });
});
