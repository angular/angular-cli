import { statSync } from 'fs';
import { join } from 'path';
import { expectFileToExist, expectFileToMatch, readFile } from '../../utils/fs';
import { ng } from '../../utils/process';

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
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  const bootstrapRegExp = /bootstrapModule\(.?[a-zA-Z]+\)\./;

  await ng('build');
  await expectFileToExist(join(process.cwd(), 'dist'));
  // Check for cache busting hash script src
  await expectFileToMatch('dist/test-project/index.html', /main\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /styles\.[0-9a-f]{20}\.css/);
  await expectFileToMatch('dist/test-project/3rdpartylicenses.txt', /MIT/);

  const indexContent = await readFile('dist/test-project/index.html');
  const mainES2017Path = indexContent.match(/src="(main\.[a-z0-9]{0,32}\.js)"/)[1];

  // Content checks
  await expectFileToMatch(`dist/test-project/${mainES2017Path}`, bootstrapRegExp);

  // Size checks in bytes
  verifySize(mainES2017Path, 141032);
}
