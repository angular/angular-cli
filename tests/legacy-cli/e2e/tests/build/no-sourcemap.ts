import * as fs from 'fs';
import { ng } from '../../utils/process';

export default async function () {
  await ng('build', '--prod', '--output-hashing=none', '--source-map', 'false');
  await testForSourceMaps(6);

  await ng('build', '--output-hashing=none', '--source-map', 'false');
  await testForSourceMaps(8);
}

async function testForSourceMaps(expectedNumberOfFiles: number): Promise <void> {
  const files = fs.readdirSync('./dist/test-project');

  let count = 0;
  for (const file of files) {
    if (!file.endsWith('.js')) {
      continue;
    }

    ++count;

    if (files.includes(file + '.map')) {
      throw new Error('Sourcemap generated for ' + file);
    }

    const content = fs.readFileSync('./dist/test-project/' + file, 'utf8');
    if (content.includes(`//# sourceMappingURL=${file}.map`)) {
      throw new Error('Sourcemap comment found generated for ' + file);
    }
  }

  if (count < expectedNumberOfFiles) {
    throw new Error(`Javascript file count is low. Expected ${expectedNumberOfFiles} but found ${count}`);
  }
}
