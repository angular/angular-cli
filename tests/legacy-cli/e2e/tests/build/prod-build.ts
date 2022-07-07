import { statSync } from 'fs';
import { join } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist, expectFileToMatch, readFile } from '../../utils/fs';
import { noSilentNg } from '../../utils/process';

function verifySize(bundle: string, baselineBytes: number) {
  const size = statSync(`dist/test-project/${bundle}`).size;
  const percentageBaseline = (baselineBytes * 10) / 100;
  const maxSize = baselineBytes + percentageBaseline;
  const minSize = baselineBytes - percentageBaseline;

  if (size >= maxSize) {
    throw new Error(
      `Expected ${bundle} size to be less than ${maxSize / 1024}Kb but it was ${size / 1024}Kb.`,
    );
  }

  if (size <= minSize) {
    throw new Error(
      `Expected ${bundle} size to be greater than ${minSize / 1024}Kb but it was ${size / 1024}Kb.`,
    );
  }
}

export default async function () {
  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  const bootstrapRegExp = /bootstrapModule\([\$_a-zA-Z]+[0-9]*\)\./;

  await noSilentNg('build');
  await expectFileToExist(join(process.cwd(), 'dist'));
  // Check for cache busting hash script src
  await expectFileToMatch('dist/test-project/index.html', /main\.[0-9a-zA-Z]{8,16}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /styles\.[0-9a-zA-Z]{8,16}\.css/);
  if (!getGlobalVariable('argv')['esbuild']) {
    // EXPERIMENTAL_ESBUILD: esbuild does not yet extract license text
    await expectFileToMatch('dist/test-project/3rdpartylicenses.txt', /MIT/);
  }

  const indexContent = await readFile('dist/test-project/index.html');
  const mainPath = indexContent.match(/src="(main\.[0-9a-zA-Z]{0,32}\.js)"/)![1];

  // Content checks
  await expectFileToMatch(`dist/test-project/${mainPath}`, bootstrapRegExp);

  // Size checks in bytes
  verifySize(mainPath, 124000);
}
