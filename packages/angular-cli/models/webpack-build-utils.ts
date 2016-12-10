import * as path from 'path';
const ExtractTextPlugin = require('extract-text-webpack-plugin');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('raw-loader')
 * require('style-loader')
 * require('postcss-loader')
 * require('css-loader')
 * require('stylus-loader')
 * require('less-loader')
 * require('sass-loader')
 *
 * require('node-sass')
 * require('less')
 * require('stylus')
 */

export const ngAppResolve = (resolvePath: string): string => {
  return path.resolve(process.cwd(), resolvePath);
};

const webpackOutputOptions = {
  colors: true,
  hash: true,
  timings: true,
  chunks: true,
  chunkModules: false,
  children: false, // listing all children is very noisy in AOT and hides warnings/errors
  modules: false,
  reasons: false,
  warnings: true,
  assets: false, // listing all assets is very noisy when using assets directories
  version: false
};

const verboseWebpackOutputOptions = {
  children: true,
  assets: true,
  version: true,
  reasons: true,
  chunkModules: false // TODO: set to true when console to file output is fixed
};

export function getWebpackStatsConfig(verbose = false) {
  return verbose
    ? Object.assign(webpackOutputOptions, verboseWebpackOutputOptions)
    : webpackOutputOptions;
}

export interface ExtraEntry {
  input: string;
  output?: string;
  lazy?: boolean;
  path?: string;
  entry?: string;
}

// create array of css loaders
export function makeCssLoaders(stylePaths: string[] = []) {
  const baseRules = [
    { test: /\.css$/, loaders: [] },
    { test: /\.scss$|\.sass$/, loaders: ['sass-loader'] },
    { test: /\.less$/, loaders: ['less-loader'] },
    { test: /\.styl$/, loaders: ['stylus-loader'] }
  ];

  const commonLoaders = ['css-loader', 'postcss-loader'];

  // load component css as raw strings
  let cssLoaders: any = baseRules.map(({test, loaders}) => ({
    exclude: stylePaths, test, loaders: ['raw-loader', ...commonLoaders, ...loaders]
  }));

  if (stylePaths.length > 0) {
    // load global css as css files
    cssLoaders.push(...baseRules.map(({test, loaders}) => ({
      include: stylePaths, test, loaders: ExtractTextPlugin.extract({
        loader: [...commonLoaders, ...loaders],
        fallbackLoader: 'style-loader'
      })
    })));
  }

  return cssLoaders;
}

// convert all extra entries into the object representation, fill in defaults
export function extraEntryParser(
  extraEntries: (string | ExtraEntry)[],
  appRoot: string,
  defaultEntry: string
): ExtraEntry[] {
  return extraEntries
    .map((extraEntry: string | ExtraEntry) =>
      typeof extraEntry === 'string' ? { input: extraEntry } : extraEntry)
    .map((extraEntry: ExtraEntry) => {
      extraEntry.path = path.resolve(appRoot, extraEntry.input);
      if (extraEntry.output) {
        extraEntry.entry = extraEntry.output.replace(/\.(js|css)$/i, '');
      } else if (extraEntry.lazy) {
        extraEntry.entry = extraEntry.input.replace(/\.(js|css|scss|sass|less|styl)$/i, '');
      } else {
        extraEntry.entry = defaultEntry;
      }
      return extraEntry;
    });
}
