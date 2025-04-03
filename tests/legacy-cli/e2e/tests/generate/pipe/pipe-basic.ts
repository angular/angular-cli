import { join } from 'node:path';
import { ng } from '../../../utils/process';

import { expectFileToExist } from '../../../utils/fs';

export default function () {
  // Create the pipe in the same directory.
  const pipeDir = join('src', 'app');

  return (
    ng('generate', 'pipe', 'test')
      .then(() => expectFileToExist(pipeDir))
      .then(() => expectFileToExist(join(pipeDir, 'test-pipe.ts')))
      .then(() => expectFileToExist(join(pipeDir, 'test-pipe.spec.ts')))

      // Try to run the unit tests.
      .then(() => ng('test', '--watch=false'))
  );
}
