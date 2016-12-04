import {writeFile, expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import { expectToFail, getClientDist } from '../../utils/utils';


export default function() {
  return writeFile('src/assets/.file', '')
    .then(() => writeFile('src/assets/test.abc', 'hello world'))
    .then(() => ng('build'))
    .then(() => expectFileToExist(`${getClientDist()}favicon.ico`))
    .then(() => expectFileToExist(`${getClientDist()}assets/.file`))
    .then(() => expectFileToMatch(`${getClientDist()}assets/test.abc`, 'hello world'))
    .then(() => expectToFail(() => expectFileToExist(`${getClientDist()}assets/.gitkeep`)))
    // doesn't break beta.16 projects
    .then(() => updateJsonFile('angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['assets'] = 'assets';
    }))
    .then(() => expectFileToExist(`${getClientDist()}assets/.file`))
    .then(() => expectFileToMatch(`${getClientDist()}assets/test.abc`, 'hello world'));
}
