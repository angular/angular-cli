import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  // Development build
  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/index.html', 'main.js');

  // Named Development build
  await ng('build', 'test-project', '--configuration=development');
  await ng('build', '--configuration=development', 'test-project', '--no-progress');
  await ng('build', '--configuration=development', '--no-progress', 'test-project');

  // Production build
  const { stderr: stderrProgress, stdout } = await ng('build', '--progress');
  await expectFileToMatch('dist/test-project/index.html', /main\.[a-zA-Z0-9]{20}\.js/);

  if (!stdout.includes('Initial Total')) {
    throw new Error(`Expected stdout to contain 'Initial Total' but it did not.\n${stdout}`);
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
