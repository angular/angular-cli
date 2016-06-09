import { ng } from '../../utils/process';
import { expectFileToExist } from '../../utils/fs';
import { expectToFail, getAppMain } from '../../utils/utils';
import { expectGitToBeClean } from '../../utils/git';
import { updateJsonFile } from '../../utils/project';


export default function() {
  return ng('build', '-o', './build-output')
    .then(() => expectFileToExist('./build-output/index.html'))
    .then(() => expectFileToExist(`./build-output/${getAppMain()}.bundle.js`))
    .then(() => expectToFail(expectGitToBeClean))
    .then(() => updateJsonFile('angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['outDir'] = 'config-build-output';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToExist('./config-build-output/index.html'))
    .then(() => expectFileToExist(`./config-build-output/${getAppMain()}.bundle.js`))
    .then(() => expectToFail(expectGitToBeClean));
}
