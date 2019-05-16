import { ng } from '../../utils/process';
import {
  expectFileToMatch,
  expectFileToExist,
  expectFileMatchToExist,
  writeMultipleFiles
} from '../../utils/fs';
import { copyProjectAsset } from '../../utils/assets';
import { expectToFail } from '../../utils/utils';

const imgSvg = `
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
  </svg>
`;

export default function () {
  return Promise.resolve()
    // Verify absolute/relative paths in global/component css.
    .then(() => writeMultipleFiles({
      'src/styles.css': `
        h1 { background: url('/assets/global-img-absolute.svg'); }
        h2 { background: url('./assets/global-img-relative.png'); }
      `,
      'src/app/app.component.css': `
        h3 { background: url('/assets/component-img-absolute.svg'); }
        h4 { background: url('../assets/component-img-relative.png'); }
      `,
      'src/assets/global-img-absolute.svg': imgSvg,
      'src/assets/component-img-absolute.svg': imgSvg
    }))
    .then(() => copyProjectAsset('images/spectrum.png', './src/assets/global-img-relative.png'))
    .then(() => copyProjectAsset('images/spectrum.png', './src/assets/component-img-relative.png'))
    .then(() => ng('build', '--extract-css', '--aot'))
    // Check paths are correctly generated.
    .then(() => expectFileToMatch('dist/test-project/styles.css', 'assets/global-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\('\/assets\/global-img-absolute\.svg'\)/))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /global-img-relative\.png/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      '/assets/component-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      /component-img-relative\.png/))
    // Check files are correctly created.
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/global-img-absolute.svg')))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/component-img-absolute.svg')))
    .then(() => expectFileMatchToExist('./dist/test-project', /global-img-relative\.png/))
    .then(() => expectFileMatchToExist('./dist/test-project', /component-img-relative\.png/))
    // Check urls with deploy-url scheme are used as is.
    .then(() => ng('build', '--base-href=/base/', '--deploy-url=http://deploy.url/',
      '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(\'\/assets\/global-img-absolute\.svg\'\)/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      /url\(\'\/assets\/component-img-absolute\.svg\'\)/))
    // Check urls with base-href scheme are used as is (with deploy-url).
    .then(() => ng('build', '--base-href=http://base.url/', '--deploy-url=deploy/',
      '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(\'\/assets\/global-img-absolute\.svg\'\)/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      /url\(\'\/assets\/component-img-absolute\.svg\'\)/))
    // Check urls with deploy-url and base-href scheme only use deploy-url.
    .then(() => ng('build', '--base-href=http://base.url/', '--deploy-url=http://deploy.url/',
      '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(\'\/assets\/global-img-absolute\.svg\'\)/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      /url\(\'\/assets\/component-img-absolute\.svg\'\)/))
    // Check with base-href and deploy-url flags.
    .then(() => ng('build', '--base-href=/base/', '--deploy-url=deploy/',
      '--extract-css', '--aot'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      '/assets/global-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /global-img-relative\.png/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      '/assets/component-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      /deploy\/component-img-relative\.png/))
    // Check with identical base-href and deploy-url flags.
    .then(() => ng('build', '--base-href=/base/', '--deploy-url=/base/',
      '--extract-css', '--aot'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      '/assets/global-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /global-img-relative\.png/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      '/assets/component-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      /\/base\/component-img-relative\.png/))
    // Check with only base-href flag.
    .then(() => ng('build', '--base-href=/base/',
      '--extract-css', '--aot'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      '/assets/global-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /global-img-relative\.png/))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      '/assets/component-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/test-project/main-es5.js',
      /component-img-relative\.png/));
}
