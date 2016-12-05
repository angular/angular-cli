import {createProjectFromAsset} from '../../../utils/assets';
import {exec} from '../../../utils/process';
import {expectFileSizeToBeUnder} from '../../../utils/fs';


export default function(skipCleaning: () => void) {
  if (process.platform.startsWith('win')) {
    // Disable the test on Windows.
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-app'))
    .then(() => exec('node_modules/.bin/webpack', '-p'))
    .then(() => expectFileSizeToBeUnder('dist/app.main.js', 400000))
    .then(() => expectFileSizeToBeUnder('dist/0.app.main.js', 40000))
    .then(() => skipCleaning());
}
