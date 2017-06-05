import { ngbench } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function () {
  return updateJsonFile('.angular-cli.json', configJson => {
    const app = configJson['apps'][0];
    app['scripts'] = ['scripts.js'];
  })
    .then(() => writeFile('src/scripts.js', ''))
    .then(() => ngbench(
      '--match-edit-file', 'src/scripts.js',
      '--match-edit-string', 'console.log(1);'
    ));
}
