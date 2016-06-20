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
      cacheInclude: options.cacheInclude || [/\.scss$/, /\.sass$/],
      cacheExclude: options.cacheExclude || undefined
    });
    this.options = options;
  }

  build() {
    this.listFiles().forEach(fileName => {
      // We skip compiling partials (_*.scss files)
      if(!/^_+.*.s[ac]ss$/.test(path.basename(fileName))) {
        // Normalize is necessary for changing `\`s into `/`s on windows.
        this.compile(path.normalize(fileName),
                     path.normalize(this.inputPaths[0]),
                     path.normalize(this.outputPath));
      }
    });
  }

  compile(fileName, inputPath, outputPath) {
    const outSourceName = fileName.replace(inputPath, outputPath);
    const outFileName = outSourceName.replace(/\.s[ac]ss$/, '.css');

    // We overwrite file, outFile and include the file path for the includePath.
    // We also make sure the options don't include a data field.
    const sassOptions = Object.assign(this.options, {
      file: fileName,
      outFile: outFileName,
      includePaths: [inputPath].concat(this.options.includePaths || [])
    });
    delete sassOptions.data;

    const result = sass.renderSync(sassOptions);
    fse.outputFileSync(outFileName, result.css, 'utf-8');
  }
}

exports.makeBroccoliTree = (sourceDir, options) => {
  options = options || {};

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

    return new SASSPlugin([sassSrcTree], options);
  }
};
