import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist, expectFileToMatch, readFile } from '../../utils/fs';
import { noSilentNg } from '../../utils/process';

function verifySize(bundle: string, baselineBytes: number) {
  const size = statSync(`dist/test-project/browser/${bundle}`).size;
  const percentageBaseline = (baselineBytes * 10) / 100;
  const maxSize = baselineBytes + percentageBaseline;
  const minSize = baselineBytes - percentageBaseline;

  assert(
    size < maxSize,
    `Expected ${bundle} size to be less than ${maxSize / 1024}Kb but it was ${size / 1024}Kb.`,
  );

  assert(
    size > minSize,
    `Expected ${bundle} size to be greater than ${minSize / 1024}Kb but it was ${size / 1024}Kb.`,
  );
}

export default async function () {
  await noSilentNg('build');
  await expectFileToExist(join(process.cwd(), 'dist'));
  // Check for cache busting hash script src
  if (getGlobalVariable('argv')['esbuild']) {
    // esbuild uses an 8 character hash and a dash as separator
    await expectFileToMatch('dist/test-project/browser/index.html', /main-[0-9a-zA-Z]{8}\.js/);
    await expectFileToMatch('dist/test-project/browser/index.html', /styles-[0-9a-zA-Z]{8}\.css/);
    await expectFileToMatch('dist/test-project/3rdpartylicenses.txt', /MIT/);
  } else {
    await expectFileToMatch('dist/test-project/browser/index.html', /main\.[0-9a-zA-Z]{16}\.js/);
    await expectFileToMatch('dist/test-project/browser/index.html', /styles\.[0-9a-zA-Z]{16}\.css/);
    await expectFileToMatch('dist/test-project/browser/3rdpartylicenses.txt', /MIT/);
  }

  const indexContent = await readFile('dist/test-project/browser/index.html');
  const mainSrcRegExp = getGlobalVariable('argv')['esbuild']
    ? /src="(main-[0-9a-zA-Z]{8}\.js)"/
    : /src="(main\.[0-9a-zA-Z]{16}\.js)"/;
  const mainPath = indexContent.match(mainSrcRegExp)![1];

  // Size checks in bytes
  verifySize(mainPath, 210000);
}
