import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as denodeify from 'denodeify';

const flattenDeep = require('lodash/flattenDeep');
const globPromise = <any>denodeify(glob);
const statPromise = <any>denodeify(fs.stat);

function isDirectory(path: string) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (_) {
    return false;
  }
}

interface Asset {
  originPath: string;
  destinationPath: string;
  relativePath: string;
}

export interface Pattern {
  glob: string;
  input?: string;
  output?: string;
}

export interface GlobCopyWebpackPluginOptions {
  patterns: (string | Pattern)[];
  globOptions: any;
}

// Adds an asset to the compilation assets;
function addAsset(compilation: any, asset: Asset) {
  const realPath = path.resolve(asset.originPath, asset.relativePath);
  // Make sure that asset keys use forward slashes, otherwise webpack dev server
  const servedPath = path.join(asset.destinationPath, asset.relativePath).replace(/\\/g, '/');

  // Don't re-add existing assets.
  if (compilation.assets[servedPath]) {
    return Promise.resolve();
  }

  // Read file and add it to assets;
  return statPromise(realPath)
    .then((stat: any) => compilation.assets[servedPath] = {
      size: () => stat.size,
      source: () => fs.readFileSync(realPath)
    });
}

export class GlobCopyWebpackPlugin {
  constructor(private options: GlobCopyWebpackPluginOptions) { }

  apply(compiler: any): void {
    let { patterns, globOptions } = this.options;
    const defaultCwd = globOptions.cwd || compiler.options.context;

    // Force nodir option, since we can't add dirs to assets.
    globOptions.nodir = true;

    // Process patterns.
    patterns = patterns.map(pattern => {
      // Convert all string patterns to Pattern type.
      pattern = typeof pattern === 'string' ? { glob: pattern } : pattern;
      // Add defaults
      // Input is always resolved relative to the defaultCwd (appRoot)
      pattern.input = path.resolve(defaultCwd, pattern.input || '');
      pattern.output = pattern.output || '';
      pattern.glob = pattern.glob || '';
      // Convert dir patterns to globs.
      if (isDirectory(path.resolve(pattern.input, pattern.glob))) {
        pattern.glob = pattern.glob + '/**/*';
      }
      return pattern;
    });

    compiler.plugin('emit', (compilation: any, cb: any) => {
      // Create an array of promises for each pattern glob
      const globs = patterns.map((pattern: Pattern) => new Promise((resolve, reject) =>
        // Individual patterns can override cwd
        globPromise(pattern.glob, Object.assign({}, globOptions, { cwd: pattern.input }))
          // Map the results onto an Asset
          .then((globResults: string[]) => globResults.map(res => ({
            originPath: pattern.input,
            destinationPath: pattern.output,
            relativePath: res
          })))
          .then((asset: Asset) => resolve(asset))
          .catch(reject)
      ));

      // Wait for all globs.
      Promise.all(globs)
        // Flatten results.
        .then(assets => flattenDeep(assets))
        // Add each asset to the compilation.
        .then(assets =>
          Promise.all(assets.map((asset: Asset) => addAsset(compilation, asset))))
        .then(() => cb());
    });
  }
}
