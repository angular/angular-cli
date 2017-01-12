const Blueprint   = require('../../ember-cli/lib/models/blueprint');
const path        = require('path');
const stringUtils = require('ember-cli-string-utils');
const getFiles = Blueprint.prototype.files;

module.exports = {
  description: '',

  availableOptions: [
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'style', type: String, default: 'css' },
    { name: 'mobile', type: Boolean, default: false },
    { name: 'routing', type: Boolean, default: false },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    { name: 'skip-git', type: Boolean, default: false, aliases: ['sg'] }
  ],

  beforeInstall: function(options) {
    if (options.ignoredUpdateFiles && options.ignoredUpdateFiles.length > 0) {
      return Blueprint.ignoredUpdateFiles = Blueprint.ignoredUpdateFiles.concat(options.ignoredUpdateFiles);
    }
  },

  afterInstall: function (options) {
    if (options.mobile) {
      return Blueprint.load(path.join(__dirname, '../mobile')).install(options);
    }
  },

  locals: function(options) {
    this.styleExt = options.style;
    this.version = require(path.resolve(__dirname, '../../package.json')).version;
    // set this.tests to opposite of skipTest options, meaning if tests are being skipped then the default.spec.BLUEPRINT will be false
    this.tests = options.skipTests ? false : true;

    // Split/join with / not path.sep as reference to typings require forward slashes.
    const relativeRootPath = options.sourceDir.split('/').map(() => '..').join('/');
    const fullAppName = stringUtils.dasherize(options.entity.name)
      .replace(/-(.)/g, (_, l) => ' ' + l.toUpperCase())
      .replace(/^./, (l) => l.toUpperCase());

    // For mobile projects, force inline styles and templates.
    if (options.mobile) {
      options.inlineStyle = true;
      options.inlineTemplate = true;
    }

    return {
      htmlComponentName: stringUtils.dasherize(options.entity.name),
      jsComponentName: stringUtils.classify(options.entity.name),
      fullAppName: fullAppName,
      version: this.version,
      sourceDir: options.sourceDir,
      prefix: options.prefix,
      styleExt: this.styleExt,
      relativeRootPath: relativeRootPath,
      isMobile: options.mobile,
      routing: options.routing,
      inlineStyle: options.inlineStyle,
      inlineTemplate: options.inlineTemplate,
      tests: this.tests
    };
  },

  files: function() {
    var fileList = getFiles.call(this);

    if (this.options && !this.options.routing) {
      fileList = fileList.filter(p => p.indexOf('app-routing.module.ts') < 0);
    }
    if (this.options && this.options.inlineTemplate) {
      fileList = fileList.filter(p => p.indexOf('app.component.html') < 0);
    }
    if (this.options && this.options.inlineStyle) {
      fileList = fileList.filter(p => p.indexOf('app.component.__styleext__') < 0);
    }
    if (this.options && this.options.skipGit) {
      fileList = fileList.filter(p => p.indexOf('gitignore') < 0);
    }

    if (this.options && this.options.skipTests) {
      fileList = fileList.filter(p => p.indexOf('app.component.spec.ts') < 0);
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
