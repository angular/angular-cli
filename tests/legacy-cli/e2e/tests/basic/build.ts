import { expectFileToMatch, replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function() {
  // Development build
  await ng('build');
  await expectFileToMatch('dist/test-project/index.html', 'main.js');

  // Named Development build
  await ng('build', 'test-project');
  await ng('build', 'test-project', '--no-progress');
  await ng('build', '--no-progress', 'test-project');

  // Enable Differential loading to run both size checks
  await replaceInFile(
    '.browserslistrc',
    'not IE 11',
    'IE 11',
  );
  // Production build
  const { stderr: stderrProgress } = await ng('build', '--prod', '--progress');
  await expectFileToMatch('dist/test-project/index.html', /main-es5\.[a-zA-Z0-9]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es2015\.[a-zA-Z0-9]{20}\.js/);

  const logs: string[] = [
    'Browser application bundle generation complete',
    'ES5 bundle generation complete',
    'Copying assets complete',
    'Index html generation complete',
  ];

  for (const log of logs) {
    if (!stderrProgress.includes(log)) {
      throw new Error(`Expected stderr to contain '${log}' but didn't.\n${stderrProgress}`);
    }
  }

  const { stderr: stderrNoProgress } = await ng('build', '--prod', '--no-progress');
  for (const log of logs) {
    if (stderrNoProgress.includes(log)) {
      throw new Error(`Expected stderr not to contain '${log}' but it did.\n${stderrProgress}`);
    }
  }
}
