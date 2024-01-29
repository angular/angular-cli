import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';

export default async function () {
  const { stderr: stderrProgress, stdout } = await ng('build', '--progress');
  if (!stdout.includes('Initial total')) {
    throw new Error(`Expected stdout to contain 'Initial total' but it did not.\n${stdout}`);
  }

  if (!stdout.includes('Estimated transfer size')) {
    throw new Error(
      `Expected stdout to contain 'Estimated transfer size' but it did not.\n${stdout}`,
    );
  }

  let logs;
  if (getGlobalVariable('argv')['esbuild']) {
    logs = ['Building...'];
  } else {
    logs = [
      'Browser application bundle generation complete',
      'Copying assets complete',
      'Index html generation complete',
    ];
  }

  for (const log of logs) {
    if (!stderrProgress.includes(log)) {
      throw new Error(`Expected stderr to contain '${log}' but didn't.\n${stderrProgress}`);
    }
  }

  const { stderr: stderrNoProgress } = await ng('build', '--no-progress');
  for (const log of logs) {
    if (stderrNoProgress.includes(log)) {
      throw new Error(`Expected stderr not to contain '${log}' but it did.\n${stderrProgress}`);
    }
  }
}
