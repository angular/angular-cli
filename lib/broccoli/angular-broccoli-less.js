/* jshint node: true, esversion: 6 */
'use strict';

const requireOrNull = require('./require-or-null');
const Plugin        = require('broccoli-caching-writer');
const fs            = require('fs');
const fse           = require('fs-extra');
const path          = require('path');
const Funnel        = require('broccoli-funnel');
const Minimatch     = require('minimatch').Minimatch;

let less = requireOrNull('less');
if (!less) {
  less = requireOrNull(`${process.env.PROJECT_ROOT}/node_modules/less`);
}

class LESSPlugin extends Plugin {
  constructor(inputNodes, lessExclude, options) {
    super(inputNodes, {});

    options = options || {};
    Plugin.call(this, inputNodes, {
      cacheInclude: [/\.less$/]
    });
    this.options = options;
    this.lessExclude = lessExclude;
  }

  build() {
    return Promise.all(this.listEntries().filter(e => {
      return !this.shouldExclude(e.relativePath);
    }).map(e => {
      let fileName = path.resolve(e.basePath, e.relativePath);
      return this.compile(fileName, this.inputPaths[0], this.outputPath, e.relativePath);
    }));
  }

  shouldExclude(path) {
    if (this.lessExclude) {
      for (var i = 0; i < this.lessExclude.length; i++) {
        if (this.lessExclude[i].match(path)) {
          return true;
        }
      }
    }
    return false;
  }

  compile(fileName, inputPath, outputPath, relativePath) {
    let content = fs.readFileSync(fileName, 'utf8');

    return less.render(content, this.options)
      .then(output => {
        let filePath = fileName.replace(inputPath, outputPath).replace(/\.less$/, '.css');
        fse.outputFileSync(filePath, output.css, 'utf8');
      }).catch(e => {
        if (e && e.message) {
          throw new Error('Error compiling less file: ' + relativePath + ' with message: "' + e.message + '"');
        }
      });
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  if (less) {
    let lessSrcTree = new Funnel(sourceDir, {
      include: ['**/*.less'],
      allowEmpty: true
    });
    var lessExclude = undefined;
    if (options['exclude-paths']) {
      lessExclude = options['exclude-paths'].map(e => {
        return new Minimatch(e);
      }); 
    }
    return new LESSPlugin([lessSrcTree], lessExclude, options);
  }
};
