/* jshint node: true, esversion: 6 */
'use strict';

try {
  process.env.NODE_PATH += `:${process.env.PWD}/node_modules`;
  require('module').Module._initPaths();
  require.resolve('node-sass');

  const Plugin  = require('broccoli-caching-writer');
  const fs      = require('fs');
  const fse     = require('fs-extra');
  const path    = require('path');
  const sass    = require('node-sass');

  class SASSPlugin extends Plugin {
    constructor(inputNodes, options) {
      super(inputNodes, {});

      options = options || {};
      Plugin.call(this, inputNodes, {
        cacheInclude: [/(.*?).scss$/, /(.*?).sass$/]
      });
      this.options = options;
      this.fileRegistry = [];
    }

    build() {
      let entries = this.listEntries();
      let rootFileNames = entries.map(e => {
        return path.resolve(e.basePath, e.relativePath);
      });

      rootFileNames.forEach(fileName => {
        this.compile(fileName, this.inputPaths[0], this.outputPath);
      });
    }

    compile(fileName, inputPath, outputPath) {
      let sassOptions = {
        file: path.join(fileName),
        includePaths: this.inputPaths
      };

      let result = sass.renderSync(sassOptions);
      let filePath = fileName.replace(inputPath, outputPath)
        .replace(/\.scss$/, '.css')
        .replace(/\.sass$/, '.css');

      fse.outputFileSync(filePath, result.css, 'utf8');
    }
  }

  module.exports = SASSPlugin;
}
catch (e) { 
  module.exports = null;
}
