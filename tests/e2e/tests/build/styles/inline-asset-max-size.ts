import { ng } from '../../../utils/process';
import {
  expectFileToMatch,
  expectFileMatchToExist,
  writeMultipleFiles
} from '../../../utils/fs';
import { copyProjectAsset } from '../../../utils/assets';
import { expectToFail } from '../../../utils/utils';

const imgSvg = `
  <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
  </svg>
`;

export default function () {
  return Promise.resolve()
    .then(() => writeMultipleFiles({
      'src/styles.css': `
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
    .then(() => ng('build', '--extract-css', '--inline-asset-max-size=-1', '--aot'))
    // Check paths are correctly generated.
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\([\'"]?large\.[0-9a-f]{20}\.png[\'"]?\)/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\([\'"]?small\.[0-9a-f]{20}\.svg[\'"]?\)/))
    .then(() => expectFileToMatch('dist/styles.bundle.css',
      /url\([\'"]?small-id\.[0-9a-f]{20}\.svg#testID[\'"]?\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\([\'"]?small\.[0-9a-f]{20}\.svg[\'"]?\)/))
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /url\([\'"]?large\.[0-9a-f]{20}\.png[\'"]?\)/))
    // Check if no inline images have been generated
    .then(() => expectToFail(() => expectFileToMatch('dist/styles.bundle.css',
      /url\(\\?[\'"]data:image\/svg\+xml/)))
    // Check files are correctly created.
    .then(() => expectFileMatchToExist('./dist', /large\.[0-9a-f]{20}\.png/))
    .then(() => expectFileMatchToExist('./dist', /small\.[0-9a-f]{20}\.svg/))
    .then(() => expectFileMatchToExist('./dist', /small-id\.[0-9a-f]{20}\.svg/));
}
