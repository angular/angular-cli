import { ng } from '../../utils/process';
import { updateTsConfig } from '../../utils/project';
import { appendToFile, writeFile } from '../../utils/fs';

export default async function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  await writeFile('projects/test-project/src/my-js-file.js', 'console.log(1); export const a = 2;');
  await appendToFile('projects/test-project/src/main.ts', `
    import { a } from './my-js-file';
    console.log(a);
  `);

  await updateTsConfig(json => {
    json['compilerOptions'].allowJs = true;
  });

  await ng('build');
  await ng('build', '--aot');
}
