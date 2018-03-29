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
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return Promise.resolve()
    .then(() => silentNpm('install', 'font-awesome@4.7.0'))
    .then(() => writeMultipleFiles({
      'projects/test-project/src/styles.scss': `
        $fa-font-path: "~font-awesome/fonts";
        @import "~font-awesome/scss/font-awesome";
        h1 { background: url('./assets/large.png'),
                         linear-gradient(to bottom, #0e40fa 25%, #0654f4 75%); }
        h2 { background: url('./assets/small.svg'); }
        p  { background: url(./assets/small-id.svg#testID); }
      `,
      'projects/test-project/src/app/app.component.css': `
        h3 { background: url('../assets/small.svg'); }
        h4 { background: url("../assets/large.png"); }
      `,
      'projects/test-project/src/assets/small.svg': imgSvg,
      'projects/test-project/src/assets/small-id.svg': imgSvg
    }))
    .then(() => copyProjectAsset('images/spectrum.png', './projects/test-project/src/assets/large.png'))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = [
        { input: 'projects/test-project/src/styles.scss' }
      ];
    }))
    .then(() => ng('build', '--extract-css', '--aot'))
    .then(({ stdout }) => {
      if (stdout.match(/postcss-url: \.+: Can't read file '\.+', ignoring/)) {
        throw new Error('Expected no postcss-url file read warnings.');
      }
    })
    // Check paths are correctly generated.
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(['"]?large\.png['"]?\),\s+linear-gradient\(to bottom, #0e40fa 25%, #0654f4 75%\);/))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(\\?['"]data:image\/svg\+xml/))
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(['"]?small-id\.svg#testID['"]?\)/))
    .then(() => expectFileToMatch('dist/test-project/main.js',
      /url\(\\?['"]data:image\/svg\+xml/))
    .then(() => expectFileToMatch('dist/test-project/main.js',
      /url\((?:['"]|\\')?large\.png(?:['"]|\\')?\)/))
    // Check files are correctly created.
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/small.svg')))
    .then(() => expectFileMatchToExist('./dist/test-project', /large\.png/))
    .then(() => expectFileMatchToExist('./dist/test-project', /small-id\.svg/));
}
