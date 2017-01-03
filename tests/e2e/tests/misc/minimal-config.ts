import { writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default function () {
  return Promise.resolve()
    .then(() => writeFile('angular-cli.json', JSON.stringify({
      apps: [{
        root: 'src',
        main: 'main.ts'
      }]
    })))
    .then(() => ng('build'));
}
