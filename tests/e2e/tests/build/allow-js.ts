import { ng } from '../../utils/process';
import { updateTsConfig } from '../../utils/project';
import { appendToFile, writeFile } from '../../utils/fs';

export default async function() {
  await writeFile('src/my-js-file.js', 'console.log(1); export const a = 2;');
  await appendToFile('src/main.ts', `
    import { a } from './my-js-file';
    console.log(a);
  `);

  await updateTsConfig(json => {
    json['compilerOptions'].allowJs = true;
  });

  await ng('build');
  await ng('build', '--aot');
}
