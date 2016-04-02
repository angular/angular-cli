/* jshint node: true, esversion: 6 */
'use strict';

try {
  let stylus;

  if (process.platform === 'win32') {
    require.resolve(`${process.env.PWD}/node_modules/stylus`);
    stylus = require(`${process.env.PWD}/node_modules/stylus`);
  } else {
    process.env.NODE_PATH += `:${process.env.PWD}/node_modules`;
    require('module').Module._initPaths();
    require.resolve('stylus');
    stylus = require('stylus');
  }

  const Plugin  = require('broccoli-caching-writer');
  const fs      = require('fs');
  const fse     = require('fs-extra');
  const path    = require('path');
  const Funnel  = require('broccoli-funnel');

  class StylusPlugin extends Plugin {
    constructor(inputNodes, options) {
      super(inputNodes, {});

      options = options || {};
      Plugin.call(this, inputNodes, {
        cacheInclude: [/(.*?).styl$/]
      });
      this.options = options;
      this.fileRegistry = [];
    }

    build() {
      let entries = this.listEntries();
      let rootFileNames = entries.map(e => {
        return path.resolve(e.basePath, e.relativePath);
      });

      return Promise.all(rootFileNames.map(fileName => {
        return this.compile(fileName, this.inputPaths[0], this.outputPath);
      }));
    }

    compile(fileName, inputPath, outputPath) {
      let content = fs.readFileSync(fileName, 'utf8');

      return stylus.render(content, { filename: path.basename(fileName) }, function(err, css) {
        let filePath = fileName.replace(inputPath, outputPath).replace(/\.styl$/, '.css');
        fse.outputFileSync(filePath, css, 'utf8');
      });
    }
  }

  exports.makeBroccoliTree = (sourceDir) => {
    let stylusSrcTree = new Funnel(sourceDir, {
      include: ['**/*.styl'],
      allowEmpty: true
    });

    return new StylusPlugin([stylusSrcTree]);
  };
} catch (e) { 
  exports.makeBroccoliTree = () => {
    return null;
  };
}
