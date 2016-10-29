import {writeFile, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';


export default function() {
  return updateJsonFile('angular-cli.json', configJson => {
    const app = configJson['apps'][0];
    app['index'] = 'index.ejs';
  })
  .then(() => writeFile('index.ejs', `
    is production? <%= htmlWebpackPlugin.options.environment.production ? 'YES' : 'NO' %>!
  `))
  .then(() => ng('build', '--env=prod'))
  .then(() => expectFileToMatch('dist/index.html', /is production? YES!/))
  .then(() => ng('build', '--env=dev'))
  .then(() => expectFileToMatch('dist/index.html', /is production? NO!/));
}
