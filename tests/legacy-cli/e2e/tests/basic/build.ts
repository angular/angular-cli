import { expectFileToMatch, moveDirectory } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function() {
  // Development build
  await ng('build');
  await expectFileToMatch('dist/test-project/index.html', 'main-es5.js');
  await expectFileToMatch('dist/test-project/index.html', 'main-es2015.js');

  // Named Development build
  await ng('build', 'test-project');
  await ng('build', 'test-project', '--no-progress');
  await ng('build', '--no-progress', 'test-project');

  // Production build
  await ng('build', '--prod');
  await expectFileToMatch('dist/test-project/index.html', /main-es2015\.[a-zA-Z0-9]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es5\.[a-zA-Z0-9]{20}\.js/);
  await ng('build', '--prod', '--no-progress', 'test-project');

  // Store the production build for artifact storage on CircleCI
  if (process.env['CIRCLECI']) {
    await ng('build', '--prod', '--output-hashing=none');
    await moveDirectory('dist', '/tmp/dist');
  }
}
