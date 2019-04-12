import { copyProjectAsset } from '../../utils/assets';
import { expectFileMatchToExist, expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';


async function verifyMedia(fileNameRe: RegExp, content: RegExp) {
  const fileName = await expectFileMatchToExist('dist/test-project/', fileNameRe);
  await expectFileToMatch(`dist/test-project/${fileName}`, content);
}

export default async function () {
  await writeMultipleFiles({
    'src/styles.css': 'body { background-image: url("./assets/image.png"); }',
  });
  // use image with file size >10KB to prevent inlining
  await copyProjectAsset('images/spectrum.png', './src/assets/image.png');
  await ng('build', '--output-hashing=all');
  await expectFileToMatch('dist/test-project/index.html', /runtime-es2015\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es2015\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /runtime-es5\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es5\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es5\.[0-9a-f]{20}\.(css|js)/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es2015\.[0-9a-f]{20}\.(css|js)/);
  await verifyMedia(/styles-es5\.[0-9a-f]{20}\.(css|js)/, /image\.[0-9a-f]{20}\.png/);
  await verifyMedia(/styles-es2015\.[0-9a-f]{20}\.(css|js)/, /image\.[0-9a-f]{20}\.png/);

  await ng('build', '--output-hashing=none');
  await expectFileToMatch('dist/test-project/index.html', /runtime-es2015\.js/);
  await expectFileToMatch('dist/test-project/index.html', /runtime-es5\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es5\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es2015\.js/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es5\.(css|js)/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es2015\.(css|js)/);
  await verifyMedia(/styles-es5\.(css|js)/, /image\.png/);
  await verifyMedia(/styles-es2015\.(css|js)/, /image\.png/);

  await ng('build', '--output-hashing=media');
  await expectFileToMatch('dist/test-project/index.html', /runtime-es2015\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es2015\.js/);
  await expectFileToMatch('dist/test-project/index.html', /runtime-es5\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es5\.js/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es5\.(css|js)/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es2015\.(css|js)/);
  await verifyMedia(/styles-es5\.(css|js)/, /image\.[0-9a-f]{20}\.png/);
  await verifyMedia(/styles-es2015\.(css|js)/, /image\.[0-9a-f]{20}\.png/);

  await ng('build', '--output-hashing=bundles');
  await expectFileToMatch('dist/test-project/index.html', /runtime-es2015\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es2015\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /runtime-es5\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /main-es5\.[0-9a-f]{20}\.js/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es5\.[0-9a-f]{20}\.(css|js)/);
  await expectFileToMatch('dist/test-project/index.html', /styles-es2015\.[0-9a-f]{20}\.(css|js)/);
  await verifyMedia(/styles-es5\.[0-9a-f]{20}\.(css|js)/, /image\.png/);
  await verifyMedia(/styles-es2015\.[0-9a-f]{20}\.(css|js)/, /image\.png/);
}
