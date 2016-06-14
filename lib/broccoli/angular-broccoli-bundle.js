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

    // The user is able to specify his own options for the SystemJS builder.
    // By the default, the CLI is always minifying the output file.
    let bundleOptions = Object.assign({
      minify: true
    }, this.options);

    return builder
      .bundle('main', `${this.outputPath}/main.js`, bundleOptions)
      .then(() => fse.copySync(`${this.inputPaths[0]}/system-config.js`,
        `${this.outputPath}/system-config.js`));
  }
}

module.exports = BundlePlugin;
