import { replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function() {
  await writeFile('src/app/index.ts', `export { AppModule } from './app.module';`);
  await replaceInFile('src/main.ts', './app/app.module', './app');
  await ng('build');
}
