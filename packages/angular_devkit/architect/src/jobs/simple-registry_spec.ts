/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { lastValueFrom } from 'rxjs';
import { createJobHandler } from './create-job-handler';
import { SimpleJobRegistry } from './simple-registry';

describe('SimpleJobRegistry', () => {
  let registry: SimpleJobRegistry;

  beforeEach(() => {
    registry = new SimpleJobRegistry();
  });

  it('works for a simple case', async () => {
    registry.register(
      'add',
      createJobHandler((arg: number[]) => arg.reduce((a, c) => a + c, 0)),
      {
        argument: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );

    expect(await lastValueFrom(registry.get('add'))).not.toBeNull();
    expect(await lastValueFrom(registry.get('add2'))).toBeNull();
  });
});
