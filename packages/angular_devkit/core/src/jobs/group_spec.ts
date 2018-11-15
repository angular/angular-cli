/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createJob } from './create-job';
import { createGroup } from './group';
import { SimpleJobRegistry } from './simple-registry';

describe('createGroup', () => {
  it('works', async () => {
    const registry = new SimpleJobRegistry();

    const group = createGroup({
      jobName: 'add',
      input: { items: { type: 'number' } },
      output: { type: 'number' },
    });
    const add0 = createJob((input: number[]) => input.reduce((a, c) => a + c, 0), {
      jobName: 'add0',
      extends: 'add',
    });
    const add100 = createJob((input: number[]) => input.reduce((a, c) => a + c, 100), {
      jobName: 'add100',
      extends: 'add',
    });

    registry.register(group);
    registry.register(add0);
    registry.register(add100);

    group.setDefaultJob(add0);
    const sum = await registry.schedule('add', [1, 2, 3, 4]).promise;
    expect(sum).toBe(10);
  });
});
