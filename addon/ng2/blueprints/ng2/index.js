const Blueprint   = require('ember-cli/lib/models/blueprint');
const path        = require('path');
const stringUtils = require('ember-cli-string-utils');
const getFiles = Blueprint.prototype.files;
const EOL = require('os').EOL;

module.exports = {
  description: '',

  availableOptions: [
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'style', type: String, default: 'css' },
    { name: 'mobile', type: Boolean, default: false }
  ],

  afterInstall: function (options) {
    if (options.mobile) {
      return Blueprint.load(path.join(__dirname, '../mobile')).install(options);
    }
  },

  locals: function(options) {
    this.styleExt = options.style;
    this.version = require(path.resolve(__dirname, '..', '..', '..', '..', 'package.json')).version;

    // Join with / not path.sep as reference to typings require forward slashes.
    const refToTypings = options.sourceDir.split(path.sep).map(() => '..').join('/');
    const fullAppName = stringUtils.dasherize(options.entity.name)
      .replace(/-(.)/g, (_, l) => ' ' + l.toUpperCase())
      .replace(/^./, (l) => l.toUpperCase());
    
    var stylePackage = '';
    switch(options.style.toLowerCase()) {
    case 'sass':
    case 'scss':
      stylePackage = `,${EOL}    "node-sass": "3.7.0"`;
      break;
    case 'styl':
      stylePackage = `,${EOL}    "stylus": "0.54.5"`;
      break; 
    }

    return {
      htmlComponentName: stringUtils.dasherize(options.entity.name),
      jsComponentName: stringUtils.classify(options.entity.name),
      fullAppName: fullAppName,
      version: this.version,
      sourceDir: options.sourceDir,
      prefix: options.prefix,
      styleExt: this.styleExt,
      refToTypings: refToTypings,
      isMobile: options.mobile,
      stylePackage: stylePackage
    };
  },

  files: function() {
    var fileList = getFiles.call(this);
    
    if (this.options && this.options.mobile) {
      fileList = fileList.filter(p => p.indexOf('__name__.component.html') < 0);
      fileList = fileList.filter(p => p.indexOf('__name__.component.__styleext__') < 0);
    }
    
    return fileList;
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __path__: () => {
        return options.locals.sourceDir;
      },
      __styleext__: () => {
        return this.styleExt;
      }
    };
  }
};
