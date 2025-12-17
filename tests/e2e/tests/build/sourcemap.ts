import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];

  // The below is needed to cache bundles and verify that sourcemaps are generated
  // corretly when output-hashing is disabled.
  await ng('build', '--output-hashing=bundles', '--source-map', '--configuration=development');

  await ng('build', '--output-hashing=none', '--source-map');
  await testForSourceMaps(useWebpackBuilder ? 2 : 1);

  await ng('build', '--output-hashing=none', '--source-map', '--configuration=development');
  await testForSourceMaps(useWebpackBuilder ? 3 : 1);
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

    assert(files.includes(file + '.map'), 'Sourcemap not generated for ' + file);

    const content = fs.readFileSync('./dist/test-project/browser/' + file, 'utf8');
    let lastLineIndex = content.lastIndexOf('\n');
    if (lastLineIndex === content.length - 1) {
      // Skip empty last line
      lastLineIndex = content.lastIndexOf('\n', lastLineIndex - 1);
    }
    const comment = lastLineIndex !== -1 && content.slice(lastLineIndex).trim();
    assert.equal(
      comment,
      `//# sourceMappingURL=${file}.map`,
      'Sourcemap comment not generated for ' + file,
    );
  }

  assert(
    count >= expectedNumberOfFiles,
    `Javascript file count is low. Expected ${expectedNumberOfFiles} but found ${count}`,
  );
}
