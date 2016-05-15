'use strict';

const fs = require('fs-extra');
const path = require('path');
const BroccoliCacheWriter = require('broccoli-caching-writer');
const Handlebars = require('handlebars');


class HandlebarReplace extends BroccoliCacheWriter {
  constructor(inputTree, context, options) {
    super([inputTree], options);
    if (options && options.helpers) {
      Object.keys(options.helpers).forEach((helperName) => {
        Handlebars.registerHelper(helperName, function() {
          const result = options.helpers[helperName].apply(null, arguments);
          return new Handlebars.SafeString(result);
        });
      })
    }
    this._context = context;
  }

  build() {
    this.listFiles().forEach((filePath) => {
      filePath = path.normalize(filePath);
      const destPath = filePath.replace(this.inputPaths[0], this.outputPath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const template = Handlebars.compile(content);

      if (!fs.existsSync(path.dirname(destPath))) {
        fs.mkdirsSync(path.dirname(destPath));
      }
      fs.writeFileSync(destPath, template(this._context), 'utf-8');
    });
  }
}

module.exports = HandlebarReplace;
