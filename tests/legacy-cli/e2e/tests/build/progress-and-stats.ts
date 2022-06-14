import { getGlobalVariable } from '../../utils/env';
import { ng } from '../../utils/process';

export default async function () {
  if (getGlobalVariable('argv')['esbuild']) {
    // EXPERIMENTAL_ESBUILD: esbuild does not yet output build stats
    return;
  }

  const { stderr: stderrProgress, stdout } = await ng('build', '--progress');
  if (!stdout.includes('Initial Total')) {
    throw new Error(`Expected stdout to contain 'Initial Total' but it did not.\n${stdout}`);
  }

  if (!stdout.includes('Estimated Transfer Size')) {
    throw new Error(
      `Expected stdout to contain 'Estimated Transfer Size' but it did not.\n${stdout}`,
    );
  }

  const logs: string[] = [
    'Browser application bundle generation complete',
    'Copying assets complete',
    'Index html generation complete',
  ];

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
