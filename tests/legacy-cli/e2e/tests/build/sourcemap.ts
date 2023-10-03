import * as fs from 'fs';
import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];

  // The below is needed to cache bundles and verify that sourcemaps are generated
  // corretly when output-hashing is disabled.
  await ng('build', '--output-hashing=bundles', '--source-map', '--configuration=development');

  await ng('build', '--output-hashing=none', '--source-map');
  await testForSourceMaps(useWebpackBuilder ? 3 : 2);

  await ng('build', '--output-hashing=none', '--source-map', '--configuration=development');
  await testForSourceMaps(useWebpackBuilder ? 4 : 2);
}

async function testForSourceMaps(expectedNumberOfFiles: number): Promise<void> {
  await expectFileToExist('dist/test-project/browser/main.js.map');

  const files = fs.readdirSync('./dist/test-project/browser');

  let count = 0;
  for (const file of files) {
    if (!file.endsWith('.js')) {
      continue;
    }

    ++count;

    if (!files.includes(file + '.map')) {
      throw new Error('Sourcemap not generated for ' + file);
    }

    const content = fs.readFileSync('./dist/test-project/browser/' + file, 'utf8');
    let lastLineIndex = content.lastIndexOf('\n');
    if (lastLineIndex === content.length - 1) {
      // Skip empty last line
      lastLineIndex = content.lastIndexOf('\n', lastLineIndex - 1);
    }
    const comment = lastLineIndex !== -1 && content.slice(lastLineIndex).trim();
    if (comment !== `//# sourceMappingURL=${file}.map`) {
      console.log('CONTENT:\n' + content);
      throw new Error('Sourcemap comment not generated for ' + file);
    }
  }

  if (count < expectedNumberOfFiles) {
    throw new Error(
      `Javascript file count is low. Expected ${expectedNumberOfFiles} but found ${count}`,
    );
  }
}
