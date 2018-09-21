import { expectFileToMatch, moveDirectory } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function() {
  // Development build
  await ng('build');
  await expectFileToMatch('dist/test-project/index.html', 'main.js');


  // Production build
  await ng('build', '--prod');
  await expectFileToMatch('dist/test-project/index.html', /main\.[a-zA-Z0-9]{20}\.js/);

  // Store the production build for artifact storage on CircleCI
  if (process.env['CIRCLECI']) {
    await ng('build', '--prod', '--output-hashing=none');
    await moveDirectory('dist', '/tmp/dist');
  }
}
