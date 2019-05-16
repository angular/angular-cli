/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// TODO: fix typings.
// tslint:disable-next-line:no-global-tslint-disable
// tslint:disable:no-any
import * as path from 'path';
import { loader } from 'webpack';
import { AngularCompilerPlugin } from './angular_compiler_plugin';
import { time, timeEnd } from './benchmark';


const sourceMappingUrlRe = /^\/\/# sourceMappingURL=[^\r\n]*/gm;

export function ngcLoader(this: loader.LoaderContext) {
  const cb = this.async();
  const sourceFileName: string = this.resourcePath;
  const timeLabel = `ngcLoader+${sourceFileName}+`;

  if (!cb) {
    throw new Error('This loader needs to support asynchronous webpack compilations.');
  }

  time(timeLabel);

  const plugin = this._compilation._ngToolsWebpackPluginInstance;
  if (!plugin) {
    throw new Error('The AngularCompilerPlugin was not found. '
                  + 'The @ngtools/webpack loader requires the plugin.');
  }

  // We must verify that the plugin is an instance of the right class.
  // Throw an error if it isn't, that often means multiple @ngtools/webpack installs.
  if (!(plugin instanceof AngularCompilerPlugin) || !plugin.done) {
    throw new Error('Angular Compiler was detected but it was an instance of the wrong class.\n'
      + 'This likely means you have several @ngtools/webpack packages installed. '
      + 'You can check this with `npm ls @ngtools/webpack`, and then remove the extra copies.',
    );
  }

  time(timeLabel + '.ngcLoader.AngularCompilerPlugin');
  plugin.done
    .then(() => {
      timeEnd(timeLabel + '.ngcLoader.AngularCompilerPlugin');
      const result = plugin.getCompiledFile(sourceFileName);

      if (result.sourceMap) {
        // Process sourcemaps for Webpack.
        // Remove the sourceMappingURL.
        result.outputText = result.outputText.replace(sourceMappingUrlRe, '');
        // Set the map source to use the full path of the file.
        const sourceMap = JSON.parse(result.sourceMap);
        sourceMap.sources = sourceMap.sources.map((fileName: string) => {
          return path.join(path.dirname(sourceFileName), fileName);
        });
        result.sourceMap = sourceMap;
      }

      // Manually add the dependencies for TS files.
      // Type only imports will be stripped out by compilation so we need to add them as
      // as dependencies.
      // Component resources files (html and css templates) also need to be added manually for
      // AOT, so that this file is reloaded when they change.
      if (sourceFileName.endsWith('.ts')) {
        result.errorDependencies.forEach(dep => this.addDependency(dep));
        const dependencies = plugin.getDependencies(sourceFileName);
        dependencies
          .filter(d => d.endsWith('index.ts'))
          .forEach(d => dependencies.push(...plugin.getDependencies(d)));

        [...new Set(dependencies)].forEach(dep => {
          plugin.updateChangedFileExtensions(path.extname(dep));
          this.addDependency(dep);
        });
      }

      // NgFactory files depend on the component template, but we can't know what that file
      // is (if any). So we add all the dependencies that the original component file has
      // to the factory as well, which includes html and css templates, and the component
      // itself (for inline html/templates templates).
      const ngFactoryRe = /\.ngfactory.js$/;
      if (ngFactoryRe.test(sourceFileName)) {
        const originalFile = sourceFileName.replace(ngFactoryRe, '.ts');
        this.addDependency(originalFile);
        const origDependencies = plugin.getDependencies(originalFile);
        origDependencies.forEach(dep => this.addDependency(dep));
      }

      // NgStyle files depend on the style file they represent.
      // E.g. `some-style.less.shim.ngstyle.js` depends on `some-style.less`.
      // Those files can in turn depend on others, so we have to add them all.
      const ngStyleRe = /(?:\.shim)?\.ngstyle\.js$/;
      if (ngStyleRe.test(sourceFileName)) {
        const styleFile = sourceFileName.replace(ngStyleRe, '');
        const styleDependencies = plugin.getResourceDependencies(styleFile);
        styleDependencies.forEach(dep => this.addDependency(dep));
      }

      timeEnd(timeLabel);
      cb(null, result.outputText, result.sourceMap as any);
    })
    .catch(err => {
      timeEnd(timeLabel);
      cb(err);
    });
}
