import { CliConfig } from '../../models/config';

const Blueprint = require('../../ember-cli/lib/models/blueprint');
const path = require('path');
const stringUtils = require('ember-cli-string-utils');
const getFiles = Blueprint.prototype.files;

export default Blueprint.extend({
  description: '',

  availableOptions: [
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'style', type: String },
    { name: 'routing', type: Boolean, default: false },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    { name: 'inline-style-all', type: Boolean, default: false, aliases: ['isa'] },
    { name: 'inline-template-all', type: Boolean, default: false, aliases: ['ita'] },
    { name: 'skip-git', type: Boolean, default: false, aliases: ['sg'] },
    { name: 'minimal', type: Boolean, default: false }
  ],

  beforeInstall: function (options: any) {
    if (options.ignoredUpdateFiles && options.ignoredUpdateFiles.length > 0) {
      return Blueprint.ignoredUpdateFiles =
        Blueprint.ignoredUpdateFiles.concat(options.ignoredUpdateFiles);
    }
  },

  locals: function (options: any) {
    if (options.minimal) {
      options.inlineStyleAll = true;
      options.inlineTemplateAll = true;
      options.skipTests = true;
    }

    this.styleExt = options.style === 'stylus' ? 'styl' : options.style;
    if (!options.style) {
      this.styleExt = CliConfig.getValue('defaults.styleExt') || 'css';
    }

    this.version = require(path.resolve(__dirname, '../../package.json')).version;
    // set this.tests to opposite of skipTest options,
    // meaning if tests are being skipped then the default.spec.BLUEPRINT will be false
    this.tests = options.skipTests ? false : true;

    // Split/join with / not path.sep as reference to typings require forward slashes.
    const relativeRootPath = options.sourceDir.split('/').map(() => '..').join('/');
    const fullAppName = (stringUtils.dasherize(options.entity.name) as string)
      .replace(/-(.)/g, (_, l) => ' ' + l.toUpperCase())
      .replace(/^./, (l) => l.toUpperCase());

    return {
      htmlComponentName: stringUtils.dasherize(options.entity.name),
      jsComponentName: stringUtils.classify(options.entity.name),
      fullAppName: fullAppName,
      version: this.version,
      sourceDir: options.sourceDir,
      prefix: options.prefix,
      styleExt: this.styleExt,
      relativeRootPath: relativeRootPath,
      routing: options.routing,
      inlineStyle: options.inlineStyle || options.inlineStyleAll,
      inlineTemplate: options.inlineTemplate || options.inlineTemplateAll,
      inlineStyleAll: options.inlineStyleAll,
      inlineTemplateAll: options.inlineTemplateAll,
      tests: this.tests,
      minimal: options.minimal
    };
  },

  files: function () {
    let fileList = getFiles.call(this) as Array<string>;

    if (this.options) {
      const inlineTemplate = this.options.inlineTemplate || this.options.inlineTemplateAll;
      const inlineStyle = this.options.inlineStyle || this.options.inlineStyleAll;
      const fileFilters: { filter: boolean, fileName: string }[] = [
        { filter: !this.options.routing, fileName: 'app-routing.module.ts' },
        { filter: inlineTemplate , fileName: 'app.component.html' },
        { filter: inlineStyle, fileName: 'app.component.__styleext__' },
        { filter: this.options.skipGit, fileName: 'gitignore' },
        { filter: this.options.skipTests, fileName: 'app.component.spec.ts' }
      ];

      fileFilters.filter(f => f.filter).forEach(({fileName}) => {
          fileList = fileList.filter(p => p.indexOf(fileName) < 0);
      });

      if (this.options.minimal) {
        const toRemoveList: RegExp[] = [/e2e\//, /editorconfig/, /README/, /karma.conf.js/,
          /protractor.conf.js/, /test.ts/, /tsconfig.spec.json/, /tslint.json/, /favicon.ico/];
        fileList = fileList.filter(p => !toRemoveList.some(re => re.test(p)));
      }
    }

    const cliConfig = CliConfig.fromProject();
    const ngConfig = cliConfig && cliConfig.config;
    if (!ngConfig || ngConfig.packageManager != 'yarn') {
      fileList = fileList.filter(p => p.indexOf('yarn.lock') < 0);
    }

    return fileList;
  },

  fileMapTokens: function (options: any) {
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
});
