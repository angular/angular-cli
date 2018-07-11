import {normalize} from 'path';
import {createProjectFromAsset} from '../../../utils/assets';
import {exec} from '../../../utils/process';
import {expectFileSizeToBeUnder, replaceInFile, expectFileToMatch} from '../../../utils/fs';


export default function(skipCleaning: () => void) {
  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-app-path-mapping'))
    .then(() => exec(normalize('node_modules/.bin/webpack-cli')))
    .then(() => expectFileToMatch('dist/app.main.js', 'NGTOOLS_WEBPACK_TEST_RIGHT_FILE'))
    .then(() => skipCleaning());
}
