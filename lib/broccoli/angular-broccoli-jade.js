/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin        = require('broccoli-caching-writer');
const fse           = require('fs-extra');
const path          = require('path');
const Funnel        = require('broccoli-funnel');

let jade = requireOrNull('jade');
if (!jade) {
  jade = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/jade`);
}

class JadePlugin extends Plugin {
  constructor(inputNodes, options) {
    super(inputNodes, {});

    options = options || {};
    Plugin.call(this, inputNodes, {
      cacheInclude: [/\.jade/]
    });
    this.options = options;
  }

  build() {
    this.listFiles().forEach(fileName => {
      this.compile(path.normalize(fileName),
        path.normalize(this.inputPaths[0]),
        path.normalize(this.outputPath));
    })
  }

  compile(fileName, inputPath, outputPath) {
    const outSourceName = fileName.replace(inputPath, outputPath);
    const outFileName = outSourceName.replace(/\.jade$/, '.html');

    // We overwrite file, outFile and include the file path for the includePath.
    // We also make sure the options don't include a data field.
    const jadeOptions = Object.assign(this.options, {
      filename: fileName,
      pretty: false
    });
    delete jadeOptions.data;

    const result = jade.renderFile(fileName, jadeOptions, (error, result) => {
      if (!error) {
        fse.outputFileSync(outFileName, result, 'utf-8');
      } else {
        console.error(error);
      }
    })
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  options = options || {};

  if (jade) {
    let jadeSrcTree = new Funnel(sourceDir, {
      include: ['**/*.jade'],
      allowEmpty: true
    });

    return new JadePlugin([jadeSrcTree], options);
  }
};
