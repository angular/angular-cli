/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { jobs } from '../../../index';

// Export the job using a createJob. We use our own spec file here to do the job.
export default jobs.createJobHandler<number[], null, number>(
  (input) => {
    return input.reduce((a, c) => a + c, 0);
  },
  {
    input: { items: { type: 'number' } },
    output: { type: 'number' },
  },
);
