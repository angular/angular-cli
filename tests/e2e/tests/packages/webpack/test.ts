import {normalize} from 'path';
import {createProjectFromAsset} from '../../../utils/assets';
import {exec} from '../../../utils/process';
import {expectFileSizeToBeUnder} from '../../../utils/fs';


export default function(skipCleaning: () => void) {
  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-app'))
    .then(() => exec(normalize('node_modules/.bin/webpack'), '-p'))
    .then(() => expectFileSizeToBeUnder('dist/app.main.js', 420000))
    .then(() => expectFileSizeToBeUnder('dist/0.app.main.js', 40000))
    .then(() => skipCleaning());
}
