import { ng } from '../../utils/process';
import { writeMultipleFiles } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  // make sure both --watch=false work
  await ng('test', '--watch=false');

  // Works with custom config
  await writeMultipleFiles({
    './karma.conf.bis.js': `
      // Karma configuration file, see link for more information
      // https://karma-runner.github.io/1.0/config/configuration-file.html
      module.exports = function (config) {
        config.set({
          basePath: '',
          frameworks: ['jasmine', '@angular-devkit/build-angular'],
          plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage'),
            require('@angular-devkit/build-angular/plugins/karma')
          ],
          client: {
            clearContext: false // leave Jasmine Spec Runner output visible in browser
          },
          reporters: ['progress', 'kjhtml'],
          port: 9876,
          colors: true,
          logLevel: config.LOG_INFO,
          autoWatch: true,
          browsers: ['ChromeHeadlessNoSandbox'],
          customLaunchers: {
            ChromeHeadlessNoSandbox: {
              base: 'ChromeHeadless',
              flags: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                '--disable-dev-shm-usage',
              ],
            }
          },
          singleRun: false,
          restartOnFileChange: true
        });
      };
      `,
  });

  const isWebpack = !getGlobalVariable('argv')['esbuild'];

  if (isWebpack) {
    await ng('test', '--watch=false', '--karma-config=karma.conf.bis.js');
  } else {
    await ng('test', '--watch=false', '--runner-config=karma.conf.bis.js');
  }
}
