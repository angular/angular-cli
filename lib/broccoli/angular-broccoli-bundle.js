/* jshint node: true, esversion: 6 */
'use strict';

const Plugin = require('broccoli-caching-writer');
const Builder = require('systemjs-builder');
const fse = require('fs-extra');
const path = require('path');

class BundlePlugin extends Plugin {
  constructor(inputNodes, options) {
    super(inputNodes, {});
    options = options || {};
    this.options = options;
  }

  build() {
    var relativeRoot = path.relative(process.cwd(), this.inputPaths[0]);
    var builder = new Builder(relativeRoot, `${relativeRoot}/system-config.js`);
    var shouldMinify = (this.options.hasOwnProperty("minify") && this.options.minify) || !this.options.hasOwnProperty("minify");
    return builder.bundle('main - [app/**/*]',
        `${this.outputPath}/main.js`, {
          minify: shouldMinify
        })
      .then(() => builder.bundle('app - (app/**/*.js - [app/**/*.js])',
        `${this.outputPath}/app/index.js`, {
          minify: shouldMinify
        }))
      .then(() => fse.copySync(`${this.inputPaths[0]}/system-config.js`,
        `${this.outputPath}/system-config.js`));
  }
}

module.exports = BundlePlugin;
