import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { silentNg } from '../../utils/process';

export default async function () {
  await assert.rejects(silentNg('e2e', 'test-project', '--dev-server-target='));

  // These should work.
  await silentNg('e2e', 'test-project');
  await setTimeout(500);
  await silentNg('e2e', 'test-project', '--dev-server-target=test-project:serve');
}
