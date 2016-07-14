/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin        = require('broccoli-caching-writer');
const fse           = require('fs-extra');
const path          = require('path');
const Funnel        = require('broccoli-funnel');

let pug = requireOrNull('pug');
if (!pug) {
  pug = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/pug`);
}

class PugPlugin extends Plugin {
  constructor(inputNodes, options) {
    super(inputNodes, {});

    options = options || {};
    Plugin.call(this, inputNodes, {
      cacheInclude: [/\.pug$/]
    });
    this.options = options;
  }

  build() {
    this.listFiles().forEach(fileName => {
      this.compile(path.normalize(fileName),
        path.normalize(this.inputPaths[0]),
        path.normalize(this.outputPath));
    });
  }

  compile(fileName, inputPath, outputPath) {
    const outSourceName = fileName.replace(inputPath, outputPath);
    const outFileName = outSourceName.replace(/\.pug$/, '.html');

    // We overwrite file, outFile and include the file path for the includePath.
    // We also make sure the options don't include a data field.
    const pugOptions = Object.assign(this.options, {
      filename: fileName,
      pretty: false
    });
    delete pugOptions.data;

    pug.renderFile(fileName, pugOptions, (error, result) => {
      if (!error) {
        fse.outputFileSync(outFileName, result, 'utf-8');
      }
    })
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  options = options || {};

  if (pug) {
    let pugSrcTree = new Funnel(sourceDir, {
      include: ['**/*.pug'],
      allowEmpty: true
    });

    return new PugPlugin([pugSrcTree], options);
  }
};
