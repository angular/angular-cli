/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin        = require('broccoli-caching-writer');
const fs            = require('fs');
const fse           = require('fs-extra');
const path          = require('path');
const Funnel        = require('broccoli-funnel');

let less = requireOrNull('less');
if (!less) {
  less = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/less`);
}

class LESSPlugin extends Plugin {
  constructor(inputNodes, options) {
    super(inputNodes, {});

    options = options || {};
    Plugin.call(this, inputNodes, {
      cacheInclude: [/\.less$/]
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

    return less.render(content, this.options)
      .then(output => {
        let filePath = fileName.replace(inputPath, outputPath).replace(/\.less$/, '.css');
        fse.outputFileSync(filePath, output.css, 'utf8');
      });
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  if (less) {
    let lessSrcTree = new Funnel(sourceDir, {
      include: ['**/*.less'],
      allowEmpty: true
    });

    return new LESSPlugin([lessSrcTree], options);
  }
};
