import {
  writeMultipleFiles,
  replaceInFile
} from '../../../utils/fs';
import { ng, silentNpm } from '../../../utils/process';
import { stripIndents } from 'common-tags';
import { updateJsonFile } from '../../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  const extensions = ['css', 'scss', 'less', 'styl'];
  let promise: Promise<any> = Promise.resolve()
    .then(() => silentNpm('install', '@angular/material@5.0.4'));

  extensions.forEach(ext => {
    promise = promise.then(() => {
      return writeMultipleFiles({
        [`projects/test-project/src/styles.${ext}`]: stripIndents`
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
        `,
        [`projects/test-project/src/app/app.component.${ext}`]: stripIndents`
          @import "~@angular/material/prebuilt-themes/indigo-pink.css";
        `,
        })
        // change files to use preprocessor
        .then(() => updateJsonFile('angular.json', workspaceJson => {
          const appArchitect = workspaceJson.projects['test-project'].architect;
          appArchitect.build.options.styles = [
            { input: `projects/test-project/src/styles.${ext}` }
          ];
        }))
        .then(() => replaceInFile('projects/test-project/src/app/app.component.ts',
          './app.component.css', `./app.component.${ext}`))
        // run build app
        .then(() => ng('build', '--extract-css', '--source-map'))
        .then(() => writeMultipleFiles({
          [`projects/test-project/src/styles.${ext}`]: stripIndents`
            @import "@angular/material/prebuilt-themes/indigo-pink.css";
          `,
          [`projects/test-project/src/app/app.component.${ext}`]: stripIndents`
            @import "@angular/material/prebuilt-themes/indigo-pink.css";
          `,
        }))
        .then(() => ng('build', '--extract-css'));
    });
  });

  return promise;
}
