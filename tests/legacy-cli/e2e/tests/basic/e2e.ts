import { setTimeout } from 'node:timers/promises';
import { silentNg } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await expectToFail(() => silentNg('e2e', 'test-project', '--dev-server-target='));

  // These should work.
  await silentNg('e2e', 'test-project');
  await setTimeout(500);
  await silentNg('e2e', 'test-project', '--dev-server-target=test-project:serve');
}
