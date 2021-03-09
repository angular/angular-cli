import { ng } from '../../utils/process';
import { copyProjectAsset } from '../../utils/assets';
import { appendToFile, expectFileToMatch, writeMultipleFiles } from '../../utils/fs';

export default function () {
  return Promise.resolve()
    .then(() => writeMultipleFiles({
      'src/styles.css': 'div { background: url("./assets/more.png"); }',
      'src/lazy.ts': 'export const lazy = "lazy";',
    }))
    .then(() => appendToFile('src/main.ts', 'import("./lazy");'))
    // use image with file size >10KB to prevent inlining
    .then(() => copyProjectAsset('images/spectrum.png', './src/assets/more.png'))
    .then(() => ng('build', '--deploy-url=deployUrl/', '--extract-css', '--configuration=development'))
    .then(() => expectFileToMatch('dist/test-project/index.html', 'deployUrl/main.js'))
    // verify --deploy-url isn't applied to extracted css urls
    .then(() => expectFileToMatch('dist/test-project/styles.css',
      /url\(['"]?more\.png['"]?\)/))
    .then(() => ng('build', '--deploy-url=http://example.com/some/path/', '--extract-css', '--configuration=development'))
    .then(() => expectFileToMatch('dist/test-project/index.html', 'http://example.com/some/path/main.js'))
    // verify --deploy-url is applied to non-extracted css urls
    .then(() => ng('build', '--deploy-url=deployUrl/', '--extract-css=false', '--configuration=development'))
    .then(() => expectFileToMatch('dist/test-project/styles.js',
      /\(['"]?deployUrl\/more\.png['"]?\)/))
    .then(() => expectFileToMatch('dist/test-project/runtime.js',
      /__webpack_require__\.p\s*=\s*"deployUrl\/";/));
}
