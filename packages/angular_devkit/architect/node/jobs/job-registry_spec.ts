/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { jobs } from '@angular-devkit/architect';
import * as path from 'path';
import { NodeModuleJobRegistry } from './job-registry';

const root = path.join(__dirname, '../../../../../tests/angular_devkit/architect/node/jobs');

describe('NodeModuleJobScheduler', () => {
  it('works', async () => {
    const registry = new NodeModuleJobRegistry();
    const scheduler = new jobs.SimpleScheduler(registry);

    const job = scheduler.schedule(path.join(root, 'add'), [1, 2, 3]);
    expect(await job.output.toPromise()).toBe(6);
  });
});
