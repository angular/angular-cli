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
    // use image with file size >10KB to prevent inlining
    .then(() => copyProjectAsset('images/spectrum.png', './assets/global-img-relative.png'))
    .then(() => copyProjectAsset('images/spectrum.png', './assets/component-img-relative.png'))
    .then(() => ng('build', '--extract-css', '--aot'))
    // Check paths are correctly generated.
    .then(() => expectFileToMatch('dist/styles.css', '/assets/global-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/styles.css',
      /url\('\/assets\/global-img-absolute\.svg'\)/))
    .then(() => expectFileToMatch('dist/styles.css',
      /global-img-relative\.[0-9a-f]{20}\.png/))
    .then(() => expectFileToMatch('dist/main.js',
      '/assets/component-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/main.js',
      /component-img-relative\.[0-9a-f]{20}\.png/))
    // Check files are correctly created.
    .then(() => expectToFail(() => expectFileToExist('dist/global-img-absolute.svg')))
    .then(() => expectToFail(() => expectFileToExist('dist/component-img-absolute.svg')))
    .then(() => expectFileMatchToExist('./dist', /global-img-relative\.[0-9a-f]{20}\.png/))
    .then(() => expectFileMatchToExist('./dist', /component-img-relative\.[0-9a-f]{20}\.png/))
    // Check urls with base-href scheme are used as is.
    .then(() => ng('build', '--base-href=http://base.url/', '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.css',
      /url\(\'\/assets\/global-img-absolute\.svg\'\)/))
    .then(() => expectFileToMatch('dist/main.js',
      /url\(\'\/assets\/component-img-absolute\.svg\'\)/))
    // Check with base-href.
    .then(() => ng('build', '--base-href=/base/', '--extract-css', '--aot'))
    .then(() => expectFileToMatch('dist/styles.css',
      '/assets/global-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/styles.css',
      /global-img-relative\.[0-9a-f]{20}\.png/))
    .then(() => expectFileToMatch('dist/main.js',
      '/assets/component-img-absolute.svg'))
    .then(() => expectFileToMatch('dist/main.js',
      /component-img-relative\.[0-9a-f]{20}\.png/));
}
