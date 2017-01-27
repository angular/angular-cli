import {normalize} from 'path';
import {createProjectFromAsset} from '../../../utils/assets';
import {exec} from '../../../utils/process';
import {expectFileSizeToBeUnder, replaceInFile} from '../../../utils/fs';


export default function(skipCleaning: () => void) {
  return Promise.resolve()
    .then(() => createProjectFromAsset('webpack/test-app'))
    .then(() => exec(normalize('node_modules/.bin/webpack'), '-p'))
    .then(() => expectFileSizeToBeUnder('dist/app.main.js', 420000))
    .then(() => expectFileSizeToBeUnder('dist/0.app.main.js', 40000))
    // test resource urls without ./
    .then(() => replaceInFile('app/app.component.ts',
      './app.component.html', 'app.component.html'))
    .then(() => replaceInFile('app/app.component.ts',
      './app.component.scss', 'app.component.scss'))
    .then(() => exec(normalize('node_modules/.bin/webpack'), '-p'))
    // test
    .then(() => skipCleaning());
}
