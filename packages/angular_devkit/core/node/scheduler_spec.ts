/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { NodeModuleJobScheduler } from './scheduler';

const root = path.join(
  path.dirname(require.resolve(__filename)),
  '../../../../tests/angular_devkit/core/node/jobs',
);


describe('NodeModuleJobScheduler', () => {
  it('works', async () => {
    const scheduler = new NodeModuleJobScheduler();

    const job = scheduler.schedule(path.join(root, 'add'), [1, 2, 3]);
    expect(await job.promise).toBe(6);
  });
});
