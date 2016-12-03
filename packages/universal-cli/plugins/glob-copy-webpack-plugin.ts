import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as denodeify from 'denodeify';

const globPromise = <any>denodeify(glob);
const statPromise = <any>denodeify(fs.stat);

export interface GlobCopyWebpackPluginOptions {
  patterns: string[];
  globOptions: any;
}

export class GlobCopyWebpackPlugin {
  constructor(private options: GlobCopyWebpackPluginOptions) { }

  apply(compiler: any): void {
    let { patterns, globOptions } = this.options;
    let context = globOptions.cwd || compiler.options.context;

    // convert dir patterns to globs
    patterns = patterns.map(pattern => fs.statSync(path.resolve(context, pattern)).isDirectory()
      ? pattern += '/**/*'
      : pattern
    );

    // force nodir option, since we can't add dirs to assets
    globOptions.nodir = true;

    compiler.plugin('emit', (compilation: any, cb: any) => {
      let globs = patterns.map(pattern => globPromise(pattern, globOptions));

      let addAsset = (relPath: string) => compilation.assets[relPath]
        // don't re-add to assets
        ? Promise.resolve()
        : statPromise(path.resolve(context, relPath))
          .then((stat: any) => compilation.assets[relPath] = {
            size: () => stat.size,
            source: () => fs.readFileSync(path.resolve(context, relPath))
          });

      Promise.all(globs)
        // flatten results
        .then(globResults => [].concat.apply([], globResults))
        // add each file to compilation assets
        .then(relPaths => relPaths.forEach((relPath: string) => addAsset(relPath)))
        .catch((err) => compilation.errors.push(err))
        .then(cb);
    });
  }
}
