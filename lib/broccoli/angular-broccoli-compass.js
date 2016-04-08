/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin        = require('broccoli-caching-writer');
const fse           = require('fs-extra');
const path          = require('path');
const Funnel        = require('broccoli-funnel');

let sass    = requireOrNull('node-sass');
let compass = requireOrNull('compass');
if (!sass || !compass) {
  sass    = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/node-sass`);
  compass = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/compass-importer`);
}

class CompassPlugin extends Plugin {
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
    let sassOptions = Object.assign(this.options, {
      data: '@import "compass"; .transition { @include transition(all); }',
      file: fileName,
      includePaths: [inputPath].concat(this.options.inputPaths || []),
      importer: compass
    });

    let result = sass.renderSync(sassOptions);
    let filePath = fileName.replace(inputPath, outputPath).replace(/\.s[ac]ss$/, '.css');

    fse.outputFileSync(filePath, result.css, 'utf8');
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  if (sass && compass) {
    let compassSrcTree = new Funnel(sourceDir, {
      include: ['**/*.scss', '**/*.sass'],
      allowEmpty: true
    });

    return new CompassPlugin([compassSrcTree], options);
  }
};
