/* jshint node: true, esversion: 6 */
'use strict';

try {
  let less;

  if (process.platform === 'win32') {
    require.resolve(`${process.env.PWD}/node_modules/less`);
    less = require(`${process.env.PWD}/node_modules/less`);
  } else {
    process.env.NODE_PATH += `:${process.env.PWD}/node_modules`;
    require('module').Module._initPaths();
    require.resolve('less');
    less = require('less');
  }

  const Plugin  = require('broccoli-caching-writer');
  const fs      = require('fs');
  const fse     = require('fs-extra');
  const path    = require('path');
  const Funnel  = require('broccoli-funnel');

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

      return less.render(content)
        .then(output => {
          let filePath = fileName.replace(inputPath, outputPath).replace(/\.less$/, '.css');
          fse.outputFileSync(filePath, output.css, 'utf8');
        });
    }
  }

  exports.makeBroccoliTree = (sourceDir) => {
    let lessSrcTree = new Funnel(sourceDir, {
      include: ['**/*.less'],
      allowEmpty: true
    });

    return new LESSPlugin([lessSrcTree]);
  };
} catch (e) { 
  exports.makeBroccoliTree = () => {
    return null;
  };
}
