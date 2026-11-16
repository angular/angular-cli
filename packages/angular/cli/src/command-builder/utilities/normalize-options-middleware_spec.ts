/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Arguments, Argv } from 'yargs';
import { createNormalizeOptionsMiddleware } from './normalize-options-middleware';

describe('createNormalizeOptionsMiddleware', () => {
  function createMockYargs(arrayOptions: string[] = []): Argv {
    return {
      getOptions: () => ({ array: arrayOptions }),
    } as unknown as Argv;
  }

  it('preserves "--" as an array without warning', () => {
    const warnSpy = spyOn(console, 'warn');
    const middleware = createNormalizeOptionsMiddleware(createMockYargs());
    const args: Arguments = {
      _: ['test'],
      $0: 'ng',
      '--': ['--update', '--reporter=verbose'],
    };

    middleware(args);

    expect(args['--']).toEqual(['--update', '--reporter=verbose']);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('collapses non-array duplicate options and warns', () => {
    const warnSpy = spyOn(console, 'warn');
    const middleware = createNormalizeOptionsMiddleware(createMockYargs());
    const args: Arguments = {
      _: [],
      $0: 'ng',
      configuration: ['development', 'production'],
    };

    middleware(args);

    expect(args['configuration']).toBe('production');
    expect(warnSpy).toHaveBeenCalledWith(
      "Option 'configuration' has been specified multiple times. The value 'production' will be used.",
    );
  });

  it('preserves declared array options without warning', () => {
    const warnSpy = spyOn(console, 'warn');
    const middleware = createNormalizeOptionsMiddleware(createMockYargs(['include']));
    const args: Arguments = {
      _: [],
      $0: 'ng',
      include: ['a.spec.ts', 'b.spec.ts'],
    };

    middleware(args);

    expect(args['include']).toEqual(['a.spec.ts', 'b.spec.ts']);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
