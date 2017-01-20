import { ngbench } from '../../utils/process';
import { replaceInFile, moveFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';


export default function () {
  const extensions = ['css', 'scss', 'less', 'styl'];
  let promise = Promise.resolve();

  extensions.forEach(ext => {
    promise = promise.then(() => {
      // change files to use preprocessor
      return updateJsonFile('.angular-cli.json', configJson => {
        const app = configJson['apps'][0];
        app['styles'] = [`styles.${ext}`];
      })
        .then(() => replaceInFile('src/app/app.component.ts',
          './app.component.css', `./app.component.${ext}`))
        .then(() => moveFile('src/styles.css', `src/styles.${ext}`))
        .then(() => moveFile('src/app/app.component.css', `src/app/app.component.${ext}`))
        // run benchmarks
        .then(() => ngbench(
          '--comment', 'component styles',
          '--match-edit-file', `src/app/app.component.${ext}`,
          '--match-edit-string', 'h1{color:blue}'
        ))
        .then(() => ngbench(
          '--comment', `.${ext} CSS extension`,
          '--match-edit-file', `src/styles.${ext}`,
          '--match-edit-string', 'h1{color:blue}'
        ))
        // change files back
        .then(() => replaceInFile('src/app/app.component.ts',
          `./app.component.${ext}`, './app.component.css'))
        .then(() => moveFile(`src/styles.${ext}`, 'src/styles.css'))
        .then(() => moveFile(`src/app/app.component.${ext}`, 'src/app/app.component.css'));

    });
  });

  return promise;
}
