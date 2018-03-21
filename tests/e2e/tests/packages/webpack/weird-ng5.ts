import {normalize} from 'path';

import {createProjectFromAsset} from '../../../utils/assets';
import {exec} from '../../../utils/process';
import {updateJsonFile} from '../../../utils/project';
import {expectFileSizeToBeUnder, expectFileToExist, expectFileToMatch} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function(skipCleaning: () => void) {
  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-app-weird-ng5'))
    .then(() => exec(normalize('node_modules/.bin/webpack-cli')))
    .then(() => expectFileToExist('dist/test-project/app.main.js'))
    .then(() => expectFileToExist('dist/test-project/0.app.main.js'))
    .then(() => expectFileToExist('dist/test-project/1.app.main.js'))
    .then(() => expectFileToExist('dist/test-project/2.app.main.js'))
    .then(() => expectFileSizeToBeUnder('dist/test-project/app.main.js', 410000))
    .then(() => expectFileSizeToBeUnder('dist/test-project/0.app.main.js', 40000))

    // Verify that we're using the production environment.
    .then(() => expectFileToMatch('dist/test-project/app.main.js', /PRODUCTION_ONLY/))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/app.main.js', /DEBUG_ONLY/)))

    // Verify that we're using the debug environment now.
    .then(() => updateJsonFile('webpack.flags.json', json => {
      json['DEBUG'] = true;
    }))
    .then(() => exec(normalize('node_modules/.bin/webpack-cli')))
    .then(() => expectFileToMatch('dist/test-project/app.main.js', /DEBUG_ONLY/))
    .then(() => expectToFail(() => expectFileToMatch('dist/test-project/app.main.js', /PRODUCTION_ONLY/)))

    .then(() => skipCleaning());
}
