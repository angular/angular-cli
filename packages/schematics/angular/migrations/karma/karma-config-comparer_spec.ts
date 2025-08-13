/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { KarmaConfigAnalysis, KarmaConfigValue, RequireInfo } from './karma-config-analyzer';
import {
  compareKarmaConfigToDefault,
  compareKarmaConfigs,
  generateDefaultKarmaConfig,
} from './karma-config-comparer';

describe('Karma Config Comparer', () => {
  describe('compareKarmaConfigs', () => {
    it('should find no differences for identical configs', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['propA', 'valueA']]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['propA', 'valueA']]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(0);
      expect(diff.removed.size).toBe(0);
      expect(diff.modified.size).toBe(0);
    });

    it('should detect added properties', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([
          ['propA', 'valueA'],
          ['propB', 'valueB'],
        ]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['propA', 'valueA']]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(1);
      expect(diff.added.get('propB') as unknown).toBe('valueB');
      expect(diff.removed.size).toBe(0);
      expect(diff.modified.size).toBe(0);
    });

    it('should detect removed properties', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['propA', 'valueA']]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([
          ['propA', 'valueA'],
          ['propB', 'valueB'],
        ]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(0);
      expect(diff.removed.size).toBe(1);
      expect(diff.removed.get('propB') as unknown).toBe('valueB');
      expect(diff.modified.size).toBe(0);
    });

    it('should detect modified properties', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['propA', 'newValue']]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['propA', 'oldValue']]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(0);
      expect(diff.removed.size).toBe(0);
      expect(diff.modified.size).toBe(1);
      const modifiedProp = diff.modified.get('propA');
      expect(modifiedProp?.projectValue as unknown).toBe('newValue');
      expect(modifiedProp?.defaultValue as unknown).toBe('oldValue');
    });

    it('should handle a mix of added, removed, and modified properties', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([
          ['propA', 'valueA'], // unchanged
          ['propB', 'newValueB'], // modified
          ['propC', 'valueC'], // added
        ]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([
          ['propA', 'valueA'],
          ['propB', 'oldValueB'],
          ['propD', 'valueD'], // removed
        ]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(1);
      expect(diff.added.get('propC') as unknown).toBe('valueC');
      expect(diff.removed.size).toBe(1);
      expect(diff.removed.get('propD') as unknown).toBe('valueD');
      expect(diff.modified.size).toBe(1);
      const modifiedPropB = diff.modified.get('propB');
      expect(modifiedPropB?.projectValue as unknown).toBe('newValueB');
      expect(modifiedPropB?.defaultValue as unknown).toBe('oldValueB');
    });

    it('should detect a modified require call', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['plugin', { module: 'project-plugin' }]]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['plugin', { module: 'default-plugin' }]]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.modified.size).toBe(1);
      const modified = diff.modified.get('plugin');
      expect((modified?.projectValue as RequireInfo).module).toBe('project-plugin');
      expect((modified?.defaultValue as RequireInfo).module).toBe('default-plugin');
    });

    it('should detect a modified path.join call', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([
          [
            'coverageReporter',
            {
              dir: {
                module: 'path',
                export: 'join',
                isCall: true,
                arguments: ['__dirname', 'project-path'],
              },
            },
          ],
        ]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([
          [
            'coverageReporter',
            {
              dir: {
                module: 'path',
                export: 'join',
                isCall: true,
                arguments: ['__dirname', 'default-path'],
              },
            },
          ],
        ]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.modified.size).toBe(1);
      const modified = diff.modified.get('coverageReporter') as {
        projectValue: { dir: RequireInfo };
        defaultValue: { dir: RequireInfo };
      };
      expect(modified?.projectValue.dir.arguments as string[]).toEqual([
        '__dirname',
        'project-path',
      ]);
      expect(modified?.defaultValue.dir.arguments as string[]).toEqual([
        '__dirname',
        'default-path',
      ]);
    });

    it('should detect an added require call', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([
          ['propA', 'valueA'],
          ['newPlugin', { module: 'new-plugin' }],
        ]),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>([['propA', 'valueA']]),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(1);
      expect((diff.added.get('newPlugin') as RequireInfo).module).toBe('new-plugin');
    });

    it('should flag the diff as unreliable if the project config has unsupported values', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>(),
        hasUnsupportedValues: true,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>(),
        hasUnsupportedValues: false,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(false);
    });

    it('should flag the diff as unreliable if the default config has unsupported values', () => {
      const projectAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>(),
        hasUnsupportedValues: false,
      };
      const defaultAnalysis: KarmaConfigAnalysis = {
        settings: new Map<string, KarmaConfigValue>(),
        hasUnsupportedValues: true,
      };

      const diff = compareKarmaConfigs(projectAnalysis, defaultAnalysis);

      expect(diff.isReliable).toBe(false);
    });
  });

  describe('compareKarmaConfigToDefault', () => {
    let defaultConfig: string;

    beforeAll(async () => {
      defaultConfig = await generateDefaultKarmaConfig('.', 'test-project', true);
    });

    it('should find no differences for the default config', async () => {
      const diff = await compareKarmaConfigToDefault(defaultConfig, 'test-project', '', true);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(0);
      expect(diff.removed.size).toBe(0);
      expect(diff.modified.size).toBe(0);
    });

    it('should find differences for a modified config', async () => {
      const modifiedConfig = defaultConfig
        .replace(`restartOnFileChange: true`, `restartOnFileChange: false`)
        .replace(`reporters: ['progress', 'kjhtml']`, `reporters: ['dots']`);

      const diff = await compareKarmaConfigToDefault(modifiedConfig, 'test-project', '', true);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(0);
      expect(diff.removed.size).toBe(0);
      expect(diff.modified.size).toBe(2);
      const restartOnFileChange = diff.modified.get('restartOnFileChange');
      expect(restartOnFileChange?.projectValue as boolean).toBe(false);
      expect(restartOnFileChange?.defaultValue as boolean).toBe(true);
      const reporters = diff.modified.get('reporters');
      expect(reporters?.projectValue as string[]).toEqual(['dots']);
      expect(reporters?.defaultValue as string[]).toEqual(['progress', 'kjhtml']);
    });

    it('should return an unreliable diff if the project config has unsupported values', async () => {
      const modifiedConfig = defaultConfig.replace(`browsers: ['Chrome']`, `browsers: myBrowsers`);
      const diff = await compareKarmaConfigToDefault(modifiedConfig, 'test-project', '', true);

      expect(diff.isReliable).toBe(false);
      expect(diff.removed.has('browsers')).toBe(true);
    });

    it('should find no differences when devkit plugin is not needed', async () => {
      const projectConfig = await generateDefaultKarmaConfig('.', 'test-project', false);
      const diff = await compareKarmaConfigToDefault(projectConfig, 'test-project', '', false);

      expect(diff.isReliable).toBe(true);
      expect(diff.added.size).toBe(0);
      expect(diff.removed.size).toBe(0);
      expect(diff.modified.size).toBe(0);
    });
  });
});
