/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { jobs } from '../../src';
import { NodeModuleJobRegistry } from './job-registry';

const root = path.join(__dirname, '../test/jobs');

describe('NodeModuleJobScheduler', () => {
  it('works', async () => {
    const registry = new NodeModuleJobRegistry();
    const scheduler = new jobs.SimpleScheduler(registry);

    const job = scheduler.schedule(path.join(root, 'add'), [1, 2, 3]);
    expect(await lastValueFrom(job.output)).toBe(6);
  });
});
