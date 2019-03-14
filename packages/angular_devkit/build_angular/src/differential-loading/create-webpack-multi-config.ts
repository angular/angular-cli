/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


//  This updates a webpack configuration which has been created by a
//  webpack-based builder for differential loading. It duplicates an
//  existing one and modifies e. g. the name of the bundles to generate
//  ([name].modern.js instead of [name].js), the resolve array, and
//  the Angular Compiler Plugin’s reference to the tsconfig.json to use.
//
//  see: https://docs.google.com/document/d/13k84oGwrEjwPyAiAjUgaaM7YHJrzYXz7Cbt6CwRp9N4/


import { AngularCompilerPlugin } from '@ngtools/webpack';
import * as webpack from 'webpack';

const StatsPlugin = require('stats-webpack-plugin');


export function createWebpackMultiConfig(config: webpack.Configuration): webpack.Configuration[] {

  const legacyConfig: webpack.Configuration = {
    ...config,
    output: buildLegacyOutput(config),
    plugins: buildLegacyPlugins(config),
    resolve: buildLegacyResolve(config),
  };

  const modernConfig: webpack.Configuration = {
    ...config,
    output: buildModernOutput(config),
    plugins: buildModernPlugins(config),
    entry: buildModernEntry(config),
    resolve: buildModernResolve(config),
  };

  const newConfig = [legacyConfig, modernConfig];

  return newConfig;
}

function buildLegacyOutput(config: webpack.Configuration): webpack.Output | undefined {

  if (!config.output || !config.output.filename) {
    return config.output;
  }

  const filename = config.output.filename.replace('[name]', '[name].legacy');

  return { ...config.output, filename };
}

function buildModernOutput(config: webpack.Configuration): webpack.Output | undefined  {

  if (!config.output || !config.output.filename) {
    return config.output;
  }

  const filename = config.output.filename.replace('[name]', '[name].modern');

  return { ...config.output, filename };
}

function buildModernResolve(config: webpack.Configuration): webpack.Resolve | undefined {

  if (!config.resolve || !config.resolve.mainFields) {
    return config.resolve;
  }

  const modernResolve = { ...config.resolve };
  modernResolve.mainFields = ['es2015', 'module', 'browser', 'main'];

  return modernResolve;
}

function buildLegacyResolve(config: webpack.Configuration): webpack.Resolve | undefined {

  if (!config.resolve || !config.resolve.mainFields) {
    return config.resolve;
  }

  const modernResolve = { ...config.resolve };
  modernResolve.mainFields = ['module', 'browser', 'main'];

  return modernResolve;
}

function buildModernEntry(config: webpack.Configuration): webpack.Entry | undefined {
  const entry = config.entry;

  if (!entry) {
    return undefined;
  }

  const polyfillsEntry = entry as webpack.Entry;

  const polyfills: string[] = polyfillsEntry['polyfills'] as string[];

  if (!polyfills) {
    return { ...polyfillsEntry };
  }

  const tweakPolyfills = (file: string) => {

    // TODO: Do we need an own polyfill file for modern browsers? If yes, where is it created?

    if (file.endsWith('polyfills.ts')) {
      return file.replace('polyfills.ts', 'polyfills.modern.ts');
    } else {
      return file;
    }
  };

  const modernPolyfills = polyfills.map(tweakPolyfills);
  const modernEntry = { ...entry as webpack.Entry, polyfills: modernPolyfills };

  return modernEntry;
}

function buildLegacyPlugins(config: webpack.Configuration): webpack.Plugin[] | undefined {
  const plugins = config.plugins;

  if (!plugins) {
    return plugins;
  }

  const legacyPlugins = [...plugins];

  const acpIndex = plugins.findIndex(p => p.constructor.name === 'AngularCompilerPlugin');
  const acp = plugins[acpIndex] as AngularCompilerPlugin;
  const legacyAcp = buildLegacyAngularCompilerPlugin(acp);
  legacyPlugins[acpIndex] = legacyAcp;

  return legacyPlugins;
}

function buildModernPlugins(config: webpack.Configuration): webpack.Plugin[] {
  const plugins = config.plugins;

  if (!plugins) {
    return [];
  }

  const modernPlugins = [...plugins];

  const statsPluginIndex = plugins.findIndex(p => p.constructor.name === 'StatsPlugin');
  if (statsPluginIndex > -1) {
    const modernStatsPlugin = buildModernStatsPlugin();
    modernPlugins[statsPluginIndex] = modernStatsPlugin;
  }

  return modernPlugins;
}

function buildModernStatsPlugin(): webpack.Plugin {
  const modernStatsPlugin = new StatsPlugin();
  modernStatsPlugin.output = 'stats.modern.json';

  return modernStatsPlugin;
}

function buildLegacyAngularCompilerPlugin(acp: AngularCompilerPlugin): AngularCompilerPlugin {
  const options = acp.options;
  const modernOptions = { ...options };

  // TODO: Where shall we create this tsconfig with target=es5?
  //  Schematics? On the fly if it does not exist?

  let tsConfigPath = modernOptions.tsConfigPath;
  if (tsConfigPath.endsWith('.json')) {
    tsConfigPath = tsConfigPath.substr(0, tsConfigPath.length - 5);
  }
  tsConfigPath += '.legacy.json';

  modernOptions.tsConfigPath = tsConfigPath;

  const legacyAcp = new AngularCompilerPlugin(modernOptions);

  return legacyAcp;
}
