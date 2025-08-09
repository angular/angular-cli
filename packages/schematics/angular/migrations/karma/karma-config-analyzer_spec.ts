/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RequireInfo, analyzeKarmaConfig } from './karma-config-analyzer';
import { generateDefaultKarmaConfig } from './karma-config-comparer';

describe('Karma Config Analyzer', () => {
  it('should parse a basic karma config file', () => {
    const karmaConf = `
      module.exports = function (config) {
        config.set({
          basePath: '',
          frameworks: ['jasmine', '@angular-devkit/build-angular'],
          plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage'),
            require('@angular-devkit/build-angular/plugins/karma'),
          ],
          client: {
            clearContext: false, // leave Jasmine Spec Runner output visible in browser
          },
          jasmineHtmlReporter: {
            suppressAll: true, // removes the duplicated traces
          },
          coverageReporter: {
            dir: require('path').join(__dirname, './coverage/test-project'),
            subdir: '.',
            reporters: [{ type: 'html' }, { type: 'text-summary' }],
          },
          reporters: ['progress', 'kjhtml'],
          port: 9876,
          colors: true,
          logLevel: config.LOG_INFO,
          autoWatch: true,
          browsers: ['Chrome'],
          singleRun: false,
          restartOnFileChange: true,
        });
      };
    `;

    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    expect(settings.get('basePath') as unknown).toBe('');
    expect(settings.get('frameworks') as unknown).toEqual([
      'jasmine',
      '@angular-devkit/build-angular',
    ]);
    expect(settings.get('port') as unknown).toBe(9876);
    expect(settings.get('autoWatch') as boolean).toBe(true);
    expect(settings.get('singleRun') as boolean).toBe(false);
    expect(settings.get('reporters') as unknown).toEqual(['progress', 'kjhtml']);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins = settings.get('plugins') as any[];
    expect(plugins).toBeInstanceOf(Array);
    expect(plugins.length).toBe(5);
    expect(plugins[0]).toEqual({ module: 'karma-jasmine' });
    expect(plugins[4]).toEqual({ module: '@angular-devkit/build-angular/plugins/karma' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coverageReporter = settings.get('coverageReporter') as any;
    const dirInfo = coverageReporter.dir as RequireInfo;
    expect(dirInfo.module).toBe('path');
    expect(dirInfo.export).toBe('join');
    expect(dirInfo.isCall).toBe(true);
    expect(dirInfo.arguments as unknown).toEqual(['__dirname', './coverage/test-project']);

    // config.LOG_INFO is a variable, so it should be flagged as unsupported
    expect(hasUnsupportedValues).toBe(true);
  });

  it('should return an empty map for an empty config file', () => {
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig('');

    expect(settings.size).toBe(0);
    expect(hasUnsupportedValues).toBe(false);
  });

  it('should handle a config file with no config.set call', () => {
    const karmaConf = `
      module.exports = function (config) {
        // No config.set call
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    expect(settings.size).toBe(0);
    expect(hasUnsupportedValues).toBe(false);
  });

  it('should detect unsupported values like variables', () => {
    const karmaConf = `
      const myBrowsers = ['Chrome', 'Firefox'];
      module.exports = function (config) {
        config.set({
          browsers: myBrowsers,
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    expect(settings.get('browsers')).toBeUndefined();
    expect(hasUnsupportedValues).toBe(true);
  });

  it('should correctly parse require with nested exports', () => {
    const karmaConf = `
      module.exports = function (config) {
        config.set({
          reporter: require('some-plugin').reporter.type,
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    const reporter = settings.get('reporter') as RequireInfo;
    expect(reporter.module).toBe('some-plugin');
    expect(reporter.export).toBe('reporter.type');
    expect(hasUnsupportedValues).toBe(false);
  });

  it('should handle an array with mixed values', () => {
    const karmaConf = `
      module.exports = function (config) {
        config.set({
          plugins: [
            'karma-jasmine',
            require('karma-chrome-launcher'),
            true,
          ],
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins = settings.get('plugins') as any[];
    expect(plugins).toEqual(['karma-jasmine', { module: 'karma-chrome-launcher' }, true]);
    expect(hasUnsupportedValues).toBe(false);
  });

  it('should not report unsupported values when all values are literals or requires', () => {
    const karmaConf = `
      module.exports = function (config) {
        config.set({
          autoWatch: true,
          browsers: ['Chrome'],
          plugins: [require('karma-jasmine')],
        });
      };
    `;
    const { hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    expect(hasUnsupportedValues).toBe(false);
  });

  it('should handle path.join with variables and flag as unsupported', () => {
    const karmaConf = `
      const myPath = './coverage/test-project';
      module.exports = function (config) {
        config.set({
          coverageReporter: {
            dir: require('path').join(__dirname, myPath),
          },
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coverageReporter = settings.get('coverageReporter') as any;
    const dirInfo = coverageReporter.dir as RequireInfo;
    expect(dirInfo.module).toBe('path');
    expect(dirInfo.export).toBe('join');
    expect(dirInfo.isCall).toBe(true);
    expect(dirInfo.arguments as unknown).toEqual(['__dirname', undefined]); // myPath is a variable
    expect(hasUnsupportedValues).toBe(true);
  });

  it('should correctly parse the default karma config template', async () => {
    const defaultConfig = await generateDefaultKarmaConfig('..', 'test-project', true);
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(defaultConfig);

    expect(hasUnsupportedValues).toBe(false);
    expect(settings.get('basePath') as unknown).toBe('');
    expect(settings.get('frameworks') as unknown).toEqual([
      'jasmine',
      '@angular-devkit/build-angular',
    ]);
    expect(settings.get('plugins') as unknown).toEqual([
      { module: 'karma-jasmine' },
      { module: 'karma-chrome-launcher' },
      { module: 'karma-jasmine-html-reporter' },
      { module: 'karma-coverage' },
      { module: '@angular-devkit/build-angular/plugins/karma' },
    ]);
    expect(settings.get('client') as unknown).toEqual({
      jasmine: {},
    });
    expect(settings.get('jasmineHtmlReporter') as unknown).toEqual({
      suppressAll: true,
    });
    const coverageReporter = settings.get('coverageReporter') as {
      dir: RequireInfo;
      subdir: string;
      reporters: { type: string }[];
    };
    expect(coverageReporter.dir.module).toBe('path');
    expect(coverageReporter.dir.export).toBe('join');
    expect(coverageReporter.dir.isCall).toBe(true);
    expect(coverageReporter.dir.arguments as unknown).toEqual([
      '__dirname',
      '../coverage/test-project',
    ]);
    expect(coverageReporter.subdir).toBe('.');
    expect(coverageReporter.reporters).toEqual([{ type: 'html' }, { type: 'text-summary' }]);
    expect(settings.get('reporters') as unknown).toEqual(['progress', 'kjhtml']);
    expect(settings.get('browsers') as unknown).toEqual(['Chrome']);
    expect(settings.get('restartOnFileChange') as unknown).toBe(true);
  });

  it('should correctly parse require with property access and a call', () => {
    const karmaConf = `
      module.exports = function (config) {
        config.set({
          reporter: require('some-plugin').reporter.doSomething(),
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    const reporter: RequireInfo = settings.get('reporter') as RequireInfo;
    expect(reporter.module).toBe('some-plugin');
    expect(reporter.export).toBe('reporter.doSomething');
    expect(reporter.isCall).toBe(true);
    expect(reporter.arguments?.length).toBe(0);
    expect(hasUnsupportedValues).toBe(false);
  });

  it('should flag require with a variable as unsupported', () => {
    const karmaConf = `
      const myPlugin = 'karma-jasmine';
      module.exports = function (config) {
        config.set({
          plugins: [require(myPlugin)],
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    const plugins = settings.get('plugins') as unknown[];
    expect(plugins.length).toBe(1);
    expect(plugins[0]).toBeUndefined();
    expect(hasUnsupportedValues).toBe(true);
  });

  it('should flag object with spread assignment as unsupported', () => {
    const karmaConf = `
      const otherSettings = { basePath: '' };
      module.exports = function (config) {
        config.set({
          ...otherSettings,
          port: 9876,
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    expect(settings.get('port') as unknown).toBe(9876);
    expect(settings.has('basePath')).toBe(false);
    expect(hasUnsupportedValues).toBe(true);
  });

  it('should flag property with computed name as unsupported', () => {
    const karmaConf = `
      const myKey = 'port';
      module.exports = function (config) {
        config.set({
          [myKey]: 9876,
        });
      };
    `;
    const { settings, hasUnsupportedValues } = analyzeKarmaConfig(karmaConf);

    expect(settings.size).toBe(0);
    expect(hasUnsupportedValues).toBe(true);
  });
});
