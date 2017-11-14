import {exec} from '../../utils/process';
import {uploadBundleJsFileSize, expectGlobFileSizeToBeUnder} from '../../utils/fs';
import {ng} from '../../utils/process';

const PROJECT_ID = 'angular-payload-size';

export default async function() {
  await ng('build', '--prod');

  // Expect size of the main bundle AND the whole app to be within 1% of an "Hello World" project.
  await expectGlobFileSizeToBeUnder('dist/main.*.js', 152200 * 1.01);
  await expectGlobFileSizeToBeUnder('dist/*', 232000 * 1.01);

  const payloadData = await uploadBundleJsFileSize('dist/*.bundle.js');
  payloadData['timestamp'] = Math.floor(Date.now()/1000);
  payloadData['message'] = process.env['TRAVIS_COMMIT_MESSAGE'].replace(/\\/g, '\\').replace(/"/g, '\"').replace(/'/g, "\'");
  const branchName = process.env['TRAVIS_BRANCH'].replace(/\./g, '-');
  const dbPath = `/payload/cli/${branchName}/${process.env['TRAVIS_COMMIT']}`;
  const payloadText = JSON.stringify(payloadData);
  console.log(`firebase database:update --data '${payloadText}' --project ${PROJECT_ID} --confirm --token ${process.env['ANGULAR_PAYLOAD_FIREBASE_TOKEN']} ${dbPath}`);
  if (process.env['TRAVIS_PULL_REQUEST'] === false) {
    exec('firebase', 'database:update', '--data', payloadText, '--project', PROJECT_ID, '--confirm', '--token', process.env['ANGULAR_PAYLOAD_FIREBASE_TOKEN'], dbPath);
  }
}
