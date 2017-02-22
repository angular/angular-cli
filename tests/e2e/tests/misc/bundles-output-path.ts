import { updateJsonFile } from '../../utils/project';
import { expectFileToExist } from '../../../utils/fs';

export default function() {
  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      configJson.apps[0].bundlesOutDir = 'bundles';
    }))
    .then(() => ng('build', '--output-hashing=none'))
    .then(() => !expectFileToExist('dist/main.bundle.js'))
    .then(() => expectFileToExist('dist/bundles/main.bundle.js'));
}
