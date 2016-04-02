/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin        = require('broccoli-caching-writer');
const fse           = require('fs-extra');
const path          = require('path');
const Funnel        = require('broccoli-funnel');

let sass = requireOrNull('node-sass');
if (!sass) {
  sass = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/node-sass`);
}

class SASSPlugin extends Plugin {
  constructor(inputNodes, options) {
    super(inputNodes, {});

    options = options || {};
    Plugin.call(this, inputNodes, {
      cacheInclude: [/\.scss$/, /\.sass$/]
    });
    this.options = options;
  }

  build() {
    this.listEntries().forEach(e => {
      let fileName = path.resolve(e.basePath, e.relativePath);
      this.compile(fileName, this.inputPaths[0], this.outputPath);
    });
  }

  compile(fileName, inputPath, outputPath) {
    let sassOptions = {
      file: path.normalize(fileName),
      includePaths: this.inputPaths
    };

    let result = sass.renderSync(sassOptions);
    let filePath = fileName.replace(inputPath, outputPath).replace(/\.s[ac]ss$/, '.css');

    fse.outputFileSync(filePath, result.css, 'utf8');
  }
}

exports.makeBroccoliTree = (sourceDir) => {
  // include sass support only if compass-importer is not installed
  let compass = requireOrNull('compass-importer');
  if (!compass) {
    compass = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/compass-importer`);
  }

  if (sass && !compass) {
    let sassSrcTree = new Funnel(sourceDir, {
      include: ['**/*.sass', '**/*.scss'],
      allowEmpty: true
    });

    return new SASSPlugin([sassSrcTree]);
  }
};
