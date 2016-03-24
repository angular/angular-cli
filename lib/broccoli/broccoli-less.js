/* jshint node: true, esversion: 6 */
'use strict';

try {
  process.env.NODE_PATH += `:${process.env.PWD}/node_modules`;
  require('module').Module._initPaths();
  require.resolve('less');

  const Plugin  = require('broccoli-caching-writer');
  const fs      = require('fs');
  const fse     = require('fs-extra');
  const path    = require('path');
  const less    = require('less');

  class LESSPlugin extends Plugin {
    constructor(inputNodes, options) {
      super(inputNodes, {});

      options = options || {};
      Plugin.call(this, inputNodes, {
        cacheInclude: [/(.*?).less$/]
      });
      this.options = options;
      this.fileRegistry = [];
    }

    build() {
      const that = this;
      let entries = this.listEntries();
      let rootFileNames = entries.map(e => {
        return path.resolve(e.basePath, e.relativePath);
      });

      let promises = [];

      rootFileNames.forEach(fileName => {
        let p = new Promise(resolve => {
          that.compile(fileName, that.inputPaths[0], that.outputPath)
            .then(() => {
              resolve();  
            });
        });

        promises.push(p);
      });

      return Promise.all(promises);
    }

    compile(fileName, inputPath, outputPath) {
      return new Promise(resolve => {
        let content = fs.readFileSync(fileName, 'utf8');

        less.render(content)
        .then(output => {
          let filePath = fileName.replace(inputPath, outputPath).replace(/\.less$/, '.css');
          fse.outputFileSync(filePath, output.css, 'utf8');
          resolve();
        });
      });
    }
  }

  module.exports = LESSPlugin;
} catch (e) { 
  module.exports = null;
}
