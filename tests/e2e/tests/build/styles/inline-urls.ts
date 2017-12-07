import { ng, silentNpm } from '../../../utils/process';
import {
  expectFileToMatch,
  expectFileToExist,
  expectFileMatchToExist,
  writeMultipleFiles
} from '../../../utils/fs';
import { copyProjectAsset } from '../../../utils/assets';
import { expectToFail } from '../../../utils/utils';
import { updateJsonFile } from '../../../utils/project';

const imgSvg = `
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
  </svg>
`;

export default function () {
  return Promise.resolve()
    .then(() => silentNpm('install', 'font-awesome@4.7.0'))
    .then(() => writeMultipleFiles({
      'src/styles.scss': `
        $fa-font-path: "~font-awesome/font";
        @import "~font-awesome/scss/font-awesome";
        h1 { background: url('./assets/large.png'); }
        h2 { background: url('./assets/small.svg'); }
        p  { background: url('./assets/small-id.svg#testID'); }
      `,
      'src/app/app.component.css': `
        h3 { background: url('../assets/small.svg'); }
        h4 { background: url('../assets/large.png'); }
      `,
      'src/assets/small.svg': imgSvg,
      'src/assets/small-id.svg': imgSvg
    }))
    .then(() => copyProjectAsset('images/spectrum.png', './assets/large.png'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['styles'] = ['styles.scss'];
    }))
    .then(() => ng('build', '--extract-css', '--aot'))
    .then(({ stdout }) => {
      if (stdout.match(/postcss-url: \.+: Can't read file '\.+', ignoring/)) {
        throw new Error('Expected no postcss-url file read warnings.');
      }
    })
    // Check paths are correctly generated.
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\([\'"]?large\.[0-9a-f]{20}\.png[\'"]?\)/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\(\\?[\'"]data:image\/svg\+xml/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\([\'"]?small-id\.[0-9a-f]{20}\.svg#testID[\'"]?\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\(\\?[\'"]data:image\/svg\+xml/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\([\'"]?large\.[0-9a-f]{20}\.png[\'"]?\)/))
    // Check files are correctly created.
    .then(() => expectToFail(() => expectFileToExist('dist/small.svg')))
    .then(() => expectFileMatchToExist('./dist', /large\.[0-9a-f]{20}\.png/))
    .then(() => expectFileMatchToExist('./dist', /small-id\.[0-9a-f]{20}\.svg/));
}
