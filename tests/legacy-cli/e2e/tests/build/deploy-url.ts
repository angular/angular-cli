import { ng } from '../../utils/process';
import { copyProjectAsset } from '../../utils/assets';
import { appendToFile, expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';

export default function () {
  if (getGlobalVariable('argv')['esbuild']) {
    return;
  }

  return (
    Promise.resolve()
      .then(() =>
        writeMultipleFiles({
          'src/styles.css': 'div { background: url("./assets/more.png"); }',
          'src/lazy.ts': 'export const lazy = "lazy";',
        }),
      )
      .then(() => appendToFile('src/main.ts', 'import("./lazy");'))
      // use image with file size >10KB to prevent inlining
      .then(() => copyProjectAsset('images/spectrum.png', './src/assets/more.png'))
      .then(() => ng('build', '--deploy-url=deployUrl/', '--configuration=development'))
      .then(() => expectFileToMatch('dist/test-project/browser/index.html', 'deployUrl/main.js'))
      // verify --deploy-url isn't applied to extracted css urls
      .then(() =>
        expectFileToMatch('dist/test-project/browser/styles.css', /url\(['"]?more\.png['"]?\)/),
      )
      .then(() =>
        ng('build', '--deploy-url=http://example.com/some/path/', '--configuration=development'),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/browser/index.html',
          'http://example.com/some/path/main.js',
        ),
      )
  );
}
