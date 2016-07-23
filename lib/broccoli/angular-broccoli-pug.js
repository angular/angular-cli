/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin             = require('broccoli-caching-writer');
const fs                    = require('fs');
const fse                  = require('fs-extra');
const path                = require('path');
const Funnel             = require('broccoli-funnel');

let pug = requireOrNull('pug');
if (!pug) {
  pug = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/pug`);
}

class PugPlugin extends Plugin {
  constructor(inputNodes, options) {
    super(inputNodes, {});

    options = options || {};
    Plugin.call(this, inputNodes, {
      cacheInclude: [/\.pug$|\.jade$/]
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
    return new Promise(resolve => {
      let filePath = fileName.replace(inputPath, outputPath).replace(/\.pug$|\.jade$/, '.html');
      let html = pug.renderFile(fileName, {
        pretty: true
      });
      fse.outputFileSync(filePath, html, 'utf8');
      resolve();
    });
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  if (pug) {
    let pugSrcTree = new Funnel(sourceDir, {
      include: ['**/*.pug', '**/*.jade'],
      allowEmpty: true
    });

    return new PugPlugin([pugSrcTree], options);
  }
};
