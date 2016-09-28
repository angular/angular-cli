import {copyAssets} from '../../../utils/assets';
import {exec, silentNpm} from '../../../utils/process';
import {updateJsonFile} from '../../../utils/project';
import {join} from 'path';
import {expectFileSizeToBeUnder} from '../../../utils/fs';


export default function(argv: any, skipCleaning: () => void) {
  const currentDir = process.cwd();

  if (process.platform.startsWith('win')) {
    // Disable the test on Windows.
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => copyAssets('webpack/test-app'))
    .then(dir => process.chdir(dir))
    .then(() => updateJsonFile('package.json', json => {
      const dist = '../../../../../dist/';
      json['dependencies']['@ngtools/webpack'] = join(__dirname, dist, 'webpack');
    }))
    .then(() => silentNpm('install'))
    .then(() => exec('node_modules/.bin/webpack', '-p'))
    .then(() => expectFileSizeToBeUnder('dist/app.main.js', 400000))
    .then(() => expectFileSizeToBeUnder('dist/0.app.main.js', 40000))
    .then(() => process.chdir(currentDir))
    .then(() => skipCleaning());
}
