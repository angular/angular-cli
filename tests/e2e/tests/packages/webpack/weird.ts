import {copyAssets} from '../../../utils/assets';
import {exec, silentNpm} from '../../../utils/process';
import {updateJsonFile} from '../../../utils/project';
import {join} from 'path';
import {expectFileSizeToBeUnder, expectFileToExist} from '../../../utils/fs';
import {expectToFail} from '../../../utils/utils';


export default function(argv: any, skipCleaning: () => void) {
  if (process.platform.startsWith('win')) {
    // Disable the test on Windows.
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => copyAssets('webpack/test-app-weird'))
    .then(dir => process.chdir(dir))
    .then(() => updateJsonFile('package.json', json => {
      const dist = '../../../../../dist/';
      json['dependencies']['@ngtools/webpack'] = join(__dirname, dist, 'webpack');
    }))
    .then(() => silentNpm('install'))
    .then(() => exec('node_modules/.bin/webpack', '-p'))
    .then(() => expectFileToExist('dist/app.main.js'))
    .then(() => expectFileToExist('dist/0.app.main.js'))
    .then(() => expectFileToExist('dist/1.app.main.js'))
    .then(() => expectFileToExist('dist/2.app.main.js'))
    .then(() => expectFileSizeToBeUnder('dist/app.main.js', 400000))
    .then(() => expectFileSizeToBeUnder('dist/0.app.main.js', 40000))

    // Skip code generation and rebuild.
    .then(() => updateJsonFile('aotplugin.config.json', json => {
      json['skipCodeGeneration'] = true;
    }))
    .then(() => exec('node_modules/.bin/webpack', '-p'))
    .then(() => expectFileToExist('dist/app.main.js'))
    .then(() => expectFileToExist('dist/0.app.main.js'))
    .then(() => expectFileToExist('dist/1.app.main.js'))
    .then(() => expectFileToExist('dist/2.app.main.js'))
    .then(() => expectToFail(() => expectFileSizeToBeUnder('dist/app.main.js', 400000)))
    .then(() => expectFileSizeToBeUnder('dist/0.app.main.js', 40000))
    .then(() => skipCleaning());
}
