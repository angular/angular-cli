/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { experimental as core_experimental } from '../../../src';
import { NodeModuleJobRegistry } from './job-registry';

const root = path.join(
  path.dirname(require.resolve(__filename)),
  '../../../../../../tests/angular_devkit/core/node/jobs',
);


describe('NodeModuleJobScheduler', () => {
  it('works', async () => {
    const registry = new NodeModuleJobRegistry();
    const scheduler = new core_experimental.jobs.SimpleScheduler(registry);

    const job = scheduler.schedule(path.join(root, 'add'), [1, 2, 3]);
    expect(await job.output.toPromise()).toBe(6);
  });
});
