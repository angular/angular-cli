/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-global-tslint-disable
// tslint:disable:no-implicit-dependencies
import { experimental } from '@angular-devkit/core';

// Export the job using a createJob. We use our own spec file here to do the job.
export default experimental.jobs.createJobHandler<number[], null, number>(input => {
  return input.reduce((a, c) => a + c, 0);
}, {
  input: { items: { type: 'number' } },
  output: { type: 'number' },
});
