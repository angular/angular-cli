import * as fs from 'fs';
import { ng } from '../../utils/process';
import {
  expectFileToMatch,
  expectFileToExist,
  expectFileMatchToExist,
  writeMultipleFiles
} from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';

const imgSvg = `
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
  </svg>
`;

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    // Verify absolute/relative paths in global/component css.
    .then(() => writeMultipleFiles({
      'src/styles.css': `
        h1 { background: url('/assets/global-img-absolute.svg'); }
        h2 { background: url('./assets/global-img-relative.svg'); }
      `,
      'src/app/app.component.css': `
        h3 { background: url('/assets/component-img-absolute.svg'); }
        h4 { background: url('../assets/component-img-relative.svg'); }
      `,
      // Using SVGs because they are loaded via file-loader and thus never inlined.
      'src/assets/global-img-absolute.svg': imgSvg,
      'src/assets/global-img-relative.svg': imgSvg,
      'src/assets/component-img-absolute.svg': imgSvg,
      'src/assets/component-img-relative.svg': imgSvg
    }))
    .then(() => ng('build', '--extract-css', '--aot'))
    // Check paths are correctly generated.
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\('\/assets\/global-img-absolute\.svg'\)/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\(global-img-relative\.[0-9a-f]{20}\.svg\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(\\'\/assets\/component-img-absolute\.svg\\'\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(component-img-relative\.[0-9a-f]{20}\.svg\)/))
    // Check files are correctly created.
    .then(() => expectToFail(() => expectFileToExist('dist/global-img-absolute.svg')))
    .then(() => expectToFail(() => expectFileToExist('dist/component-img-absolute.svg')))
    .then(() => expectFileMatchToExist('./dist', /global-img-relative\.[0-9a-f]{20}\.svg/))
    .then(() => expectFileMatchToExist('./dist', /component-img-relative\.[0-9a-f]{20}\.svg/))
    // Check urls with deploy-url scheme are used as is.
    .then(() => ng('build', '--base-href=/base/', '--deploy-url=http://deploy.url/',
      '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\(\'http:\/\/deploy\.url\/assets\/global-img-absolute\.svg\'\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(\'http:\/\/deploy\.url\/assets\/component-img-absolute\.svg\'\)/))
    // Check urls with base-href scheme are used as is (with deploy-url).
    .then(() => ng('build', '--base-href=http://base.url/', '--deploy-url=deploy/',
      '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\(\'http:\/\/base\.url\/deploy\/assets\/global-img-absolute\.svg\'\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(\'http:\/\/base\.url\/deploy\/assets\/component-img-absolute\.svg\'\)/))
    // Check urls with deploy-url and base-href scheme only use deploy-url.
    .then(() => ng('build', '--base-href=http://base.url/', '--deploy-url=http://deploy.url/',
      '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\(\'http:\/\/deploy\.url\/assets\/global-img-absolute\.svg\'\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(\'http:\/\/deploy\.url\/assets\/component-img-absolute\.svg\'\)/))
    // Check with base-href and deploy-url flags.
    .then(() => ng('build', '--base-href=/base/', '--deploy-url=deploy/',
      '--extract-css', '--aot'))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\('\/base\/deploy\/assets\/global-img-absolute\.svg'\)/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\(global-img-relative\.[0-9a-f]{20}\.svg\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(\\'\/base\/deploy\/assets\/component-img-absolute\.svg\\'\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(deploy\/component-img-relative\.[0-9a-f]{20}\.svg\)/));
}
