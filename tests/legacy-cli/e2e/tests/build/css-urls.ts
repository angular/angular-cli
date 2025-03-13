import { ng } from '../../utils/process';
import {
  expectFileToMatch,
  expectFileToExist,
  expectFileMatchToExist,
  writeMultipleFiles,
} from '../../utils/fs';
import { copyProjectAsset } from '../../utils/assets';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';
import { mkdir } from 'node:fs/promises';

const imgSvg = `
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
  </svg>
`;

export default async function () {
  const usingWebpack = !getGlobalVariable('argv')['esbuild'];

  const mediaPath = usingWebpack
    ? './dist/test-project/browser'
    : './dist/test-project/browser/media';

  await mkdir('public/assets/', { recursive: true });

  await Promise.resolve()
    // Verify absolute/relative paths in global/component css.
    .then(() =>
      writeMultipleFiles({
        'src/styles.css': `
        h1 { background: url('/assets/global-img-absolute.svg'); }
        h2 { background: url('./assets/global-img-relative.png'); }
      `,
        'src/app/app.css': `
        h3 { background: url('/assets/component-img-absolute.svg'); }
        h4 { background: url('../assets/component-img-relative.png'); }
      `,
        'public/assets/global-img-absolute.svg': imgSvg,
        'public/assets/component-img-absolute.svg': imgSvg,
      }),
    )
    .then(() => copyProjectAsset('images/spectrum.png', './src/assets/global-img-relative.png'))
    .then(() => copyProjectAsset('images/spectrum.png', './src/assets/component-img-relative.png'))
    .then(() => ng('build', '--aot', '--configuration=development'))
    // Check paths are correctly generated.
    .then(() =>
      expectFileToMatch('dist/test-project/browser/styles.css', 'assets/global-img-absolute.svg'),
    )
    .then(() =>
      expectFileToMatch(
        'dist/test-project/browser/styles.css',
        /url\((['"]?)\/assets\/global-img-absolute\.svg\1\)/,
      ),
    )
    .then(() =>
      expectFileToMatch('dist/test-project/browser/styles.css', /global-img-relative\.png/),
    )
    .then(() =>
      expectFileToMatch('dist/test-project/browser/main.js', '/assets/component-img-absolute.svg'),
    )
    .then(() =>
      expectFileToMatch('dist/test-project/browser/main.js', /component-img-relative\.png/),
    )
    // Check files are correctly created.
    .then(() => expectToFail(() => expectFileToExist(`${mediaPath}/global-img-absolute.svg`)))
    .then(() => expectToFail(() => expectFileToExist(`${mediaPath}/component-img-absolute.svg`)))
    .then(() => expectFileMatchToExist(mediaPath, /global-img-relative\.png/))
    .then(() => expectFileMatchToExist(mediaPath, /component-img-relative\.png/));

  // Early exit before deploy url tests
  if (!usingWebpack) {
    return;
  }

  // Check urls with deploy-url scheme are used as is.
  return (
    Promise.resolve()
      .then(() =>
        ng(
          'build',
          '--base-href=/base/',
          '--deploy-url=http://deploy.url/',
          '--configuration=development',
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/styles.css',
          /url\(\'\/assets\/global-img-absolute\.svg\'\)/,
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          /url\(\'\/assets\/component-img-absolute\.svg\'\)/,
        ),
      )
      // Check urls with base-href scheme are used as is (with deploy-url).
      .then(() =>
        ng(
          'build',
          '--base-href=http://base.url/',
          '--deploy-url=deploy/',
          '--configuration=development',
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/styles.css',
          /url\(\'\/assets\/global-img-absolute\.svg\'\)/,
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          /url\(\'\/assets\/component-img-absolute\.svg\'\)/,
        ),
      )
      // Check urls with deploy-url and base-href scheme only use deploy-url.
      .then(() =>
        ng(
          'build',
          '--base-href=http://base.url/',
          '--deploy-url=http://deploy.url/',
          '--configuration=development',
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/styles.css',
          /url\(\'\/assets\/global-img-absolute\.svg\'\)/,
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          /url\(\'\/assets\/component-img-absolute\.svg\'\)/,
        ),
      )
      // Check with base-href and deploy-url flags.
      .then(() =>
        ng(
          'build',
          '--base-href=/base/',
          '--deploy-url=deploy/',
          '--aot',
          '--configuration=development',
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/styles.css',
          '/assets/global-img-absolute.svg',
        ),
      )
      .then(() =>
        expectFileToMatch('dist/test-project/browser/styles.css', /global-img-relative\.png/),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          '/assets/component-img-absolute.svg',
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          /deploy\/component-img-relative\.png/,
        ),
      )
      // Check with identical base-href and deploy-url flags.
      .then(() =>
        ng(
          'build',
          '--base-href=/base/',
          '--deploy-url=/base/',
          '--aot',
          '--configuration=development',
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/styles.css',
          '/assets/global-img-absolute.svg',
        ),
      )
      .then(() =>
        expectFileToMatch('dist/test-project/browser/styles.css', /global-img-relative\.png/),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          '/assets/component-img-absolute.svg',
        ),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          /\/base\/component-img-relative\.png/,
        ),
      )
      // Check with only base-href flag.
      .then(() => ng('build', '--base-href=/base/', '--aot', '--configuration=development'))
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/styles.css',
          '/assets/global-img-absolute.svg',
        ),
      )
      .then(() =>
        expectFileToMatch('dist/test-project/browser/styles.css', /global-img-relative\.png/),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/main.js',
          '/assets/component-img-absolute.svg',
        ),
      )
      .then(() =>
        expectFileToMatch('dist/test-project/browser/main.js', /component-img-relative\.png/),
      )
  );
}
