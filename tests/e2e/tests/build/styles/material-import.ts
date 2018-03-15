import {
  writeMultipleFiles,
  replaceInFile
} from '../../../utils/fs';
import { ng, silentNpm } from '../../../utils/process';
import { stripIndents } from 'common-tags';
import { updateJsonFile } from '../../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-webpack.

  const extensions = ['css', 'scss', 'less', 'styl'];
  let promise: Promise<any> = Promise.resolve()
    .then(() => silentNpm('install', '@angular/material@5.0.4'));

  extensions.forEach(ext => {
    promise = promise.then(() => {
      return writeMultipleFiles({
        [`src/styles.${ext}`]: stripIndents`
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
        `,
        [`src/app/app.component.${ext}`]: stripIndents`
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
        `,
        })
        // change files to use preprocessor
        .then(() => updateJsonFile('.angular-cli.json', configJson => {
          const app = configJson['apps'][0];
          app['styles'] = [`styles.${ext}`];
        }))
        .then(() => replaceInFile('src/app/app.component.ts',
          './app.component.css', `./app.component.${ext}`))
        // run build app
        .then(() => ng('build', '--extract-css', '--source-map'))
        .then(() => writeMultipleFiles({
          [`src/styles.${ext}`]: stripIndents`
            @import "@angular/material/prebuilt-themes/indigo-pink.css";
          `,
          [`src/app/app.component.${ext}`]: stripIndents`
            @import "@angular/material/prebuilt-themes/indigo-pink.css";
          `,
        }))
        .then(() => ng('build', '--extract-css'));
    });
  });

  return promise;
}
