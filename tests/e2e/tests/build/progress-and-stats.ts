import assert from 'node:assert/strict';
import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';

export default async function () {
  const { stderr: stderrProgress, stdout } = await ng('build', '--progress');
  assert.match(stdout, /Initial total/);
  assert.match(stdout, /Estimated transfer size/);

  let logs;
  if (getGlobalVariable('argv')['esbuild']) {
    assert.match(stdout, /Building\.\.\./);

    return;
  } else {
    logs = [
      'Browser application bundle generation complete',
      'Copying assets complete',
      'Index html generation complete',
    ];
  }

  for (const log of logs) {
    assert.match(stderrProgress, new RegExp(log));
  }

  const { stderr: stderrNoProgress } = await ng('build', '--no-progress');
  for (const log of logs) {
    assert.doesNotMatch(stderrNoProgress, new RegExp(log));
  }
}
