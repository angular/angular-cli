import { createProjectFromAsset } from '../../utils/assets';
import { replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';

// This test ensures a project generated with 1.0.0 will still work.
// Only change it test on major releases.

export default function () {
  return Promise.resolve()
    .then(() => createProjectFromAsset('1.0.0-proj'))
    // Update chrome configs.
    .then(() => replaceInFile('protractor.conf.js', `'browserName': 'chrome'`,
      `'browserName': 'chrome',
        chromeOptions: {
          args: [
            "--enable-logging",
            "--no-sandbox",
            ${process.env['TRAVIS'] ? '"--headless", "--disable-gpu"' : ''}
          ]
        }
      `))
    .then(() => replaceInFile('karma.conf.js', `browsers: ['Chrome'],`,
      `browsers: ['ChromeCI'],
      customLaunchers: {
        ChromeCI: {
          base: '${process.env['TRAVIS'] ? 'ChromeHeadless' : 'Chrome'}',
          flags: ['--no-sandbox']
        }
      },
      `))
    .then(() => ng('generate', 'component', 'my-comp'))
    .then(() => ng('lint'))
    .then(() => ng('test', '--single-run'))
    .then(() => ng('e2e'))
    .then(() => ng('e2e', '--prod'));
}
