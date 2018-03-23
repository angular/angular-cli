import {exec} from '../../utils/process';
import {uploadBundleJsFileSize, expectGlobFileSizeToBeUnder} from '../../utils/fs';
import {ng} from '../../utils/process';

const PROJECT_ID = 'angular-payload-size';

export default async function() {
  await ng('build', '--prod');

  // Expect size of the main bundle AND the whole app to be within 1% of an "Hello World" project.
  await expectGlobFileSizeToBeUnder('dist/main.*.js', 152200 * 1.01);
  await expectGlobFileSizeToBeUnder('dist/*', 232000 * 1.01);

  // Upload payload size to firebase
  const payloadData = await uploadBundleJsFileSize('dist/*.bundle.js');
  const commit = process.env['TRAVIS_COMMIT'] || process.env['APPVEYOR_REPO_COMMIT'];
  const message = process.env['TRAVIS_COMMIT_MESSAGE'] ||
      process.env['APPVEYOR_REPO_COMMIT_MESSAGE'];
  const branch = process.env['TRAVIS_BRANCH'] || process.env['APPVEYOR_REPO_BRANCH'];

  // Add timestamp and commit message
  payloadData['timestamp'] = Math.floor(Date.now()/1000);
  payloadData['message'] = JSON.stringify(message);

  // The database path will be /payload/cli/$branch/$commit
  const branchName = branch.replace(/\./g, '-');
  const dbPath = `/payload/cli/${branchName}/${commit}`;
  const payloadText = JSON.stringify(payloadData);

  // Log the data
  console.log(`The data for cli branch ${branchName} commit ${commit} is:`);
  console.log(payloadText);
  if (process.env['TRAVIS_PULL_REQUEST'] === false) {
    await exec('firebase', 'database:update', '--data', payloadText, '--project', PROJECT_ID,
               '--confirm', '--token', process.env['ANGULAR_PAYLOAD_FIREBASE_TOKEN'], dbPath);
  }
}
