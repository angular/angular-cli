import { ng } from '../../utils/process';
import { copyProjectAsset } from '../../utils/assets';
import { expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';


export default function () {
  return Promise.resolve()
    .then(() => writeMultipleFiles({
      'src/styles.css': 'div { background: url("./assets/more.png"); }',
    }))
    // use image with file size >10KB to prevent inlining
    .then(() => copyProjectAsset('images/spectrum.png', './src/assets/more.png'))
    .then(() => ng('build', '--deploy-url=deployUrl/', '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/index.html', 'deployUrl/main-es5.js'))
    // verify --deploy-url isn't applied to extracted css urls
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(['"]?more\.png['"]?\)/))
    .then(() => ng('build', '--deploy-url=http://example.com/some/path/', '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/index.html', 'http://example.com/some/path/main-es5.js'))
    // verify --deploy-url is applied to non-extracted css urls
    .then(() => ng('build', '--deploy-url=deployUrl/', '--extract-css=false'))
    .then(() => expectFileToMatch('dist/test-project/styles-es5.js',
      /\(['"]?deployUrl\/more\.png['"]?\)/))
    .then(() => expectFileToMatch('dist/test-project/runtime-es5.js',
      /__webpack_require__\.p\s*=\s*"deployUrl\/";/));
    // // verify slash is appended to the end of --deploy-url if missing
    // .then(() => ng('build', '--deploy-url=deployUrl', '--extract-css=false'))
    // .then(() =>
    //   expectFileToMatch('dist/test-project/untime.js', /__webpack_require__\.p = "deployUrl\/";/));
}
