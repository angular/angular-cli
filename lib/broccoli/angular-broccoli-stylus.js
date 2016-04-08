/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin        = require('broccoli-caching-writer');
const fs            = require('fs');
const fse           = require('fs-extra');
const path          = require('path');
const Funnel        = require('broccoli-funnel');

let stylus = requireOrNull('stylus');
if (!stylus) {
  stylus = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/stylus`);
}

class StylusPlugin extends Plugin {
  constructor(inputNodes, options) {
    super(inputNodes, {});

    options = options || {};
    Plugin.call(this, inputNodes, {
      cacheInclude: [/\.styl$/]
    });
    this.options = options;
  }

  build() {
    return Promise.all(this.listEntries().map(e => {
      let fileName = path.resolve(e.basePath, e.relativePath);
      return this.compile(fileName, this.inputPaths[0], this.outputPath);
    }));
  }

  compile(fileName, inputPath, outputPath) {
    let content = fs.readFileSync(fileName, 'utf8');

    const options = Object.assign(this.options, {
      filename: path.basename(fileName)
    });

    return stylus.render(content, options, function(err, css) {
      let filePath = fileName.replace(inputPath, outputPath).replace(/\.styl$/, '.css');
      fse.outputFileSync(filePath, css, 'utf8');
    });
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  if (stylus) {
    let stylusSrcTree = new Funnel(sourceDir, {
      include: ['**/*.styl'],
      allowEmpty: true
    });

    return new StylusPlugin([stylusSrcTree], options);
  }
};
