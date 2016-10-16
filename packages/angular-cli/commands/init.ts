import LinkCli from '../tasks/link-cli';
import NpmInstall from '../tasks/npm-install';

const Command = require('ember-cli/lib/models/command');
const Promise = require('ember-cli/lib/ext/promise');
const SilentError = require('silent-error');
const validProjectName = require('ember-cli/lib/utilities/valid-project-name');
const normalizeBlueprint = require('ember-cli/lib/utilities/normalize-blueprint-option');
const GitInit = require('../tasks/git-init');


const InitCommand: any = Command.extend({
  name: 'init',
  description: 'Creates a new angular-cli project in the current folder.',
  aliases: ['i'],
  works: 'everywhere',

  availableOptions: [
    { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
    { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
    { name: 'link-cli', type: Boolean, default: false, aliases: ['lc'] },
    { name: 'skip-npm', type: Boolean, default: false, aliases: ['sn'] },
    { name: 'skip-bower', type: Boolean, default: true, aliases: ['sb'] },
    { name: 'name', type: String, default: '', aliases: ['n'] },
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'style', type: String, default: 'css' },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'mobile', type: Boolean, default: false },
    { name: 'routing', type: Boolean, default: false },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] }
  ],

  anonymousOptions: ['<glob-pattern>'],

  run: function (commandOptions: any, rawArgs: string[]) {
    if (commandOptions.dryRun) {
      commandOptions.skipNpm = true;
      commandOptions.skipBower = true;
    }

    const installBlueprint = new this.tasks.InstallBlueprint({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    // needs an explicit check in case it's just 'undefined'
    // due to passing of options from 'new' and 'addon'
    let gitInit: any;
    if (commandOptions.skipGit === false) {
      gitInit = new GitInit({
        ui: this.ui,
        project: this.project
      });
    }

    let npmInstall: any;
    if (!commandOptions.skipNpm) {
      npmInstall = new NpmInstall({
        ui: this.ui,
        analytics: this.analytics,
        project: this.project
      });
    }

    let linkCli: any;
    if (commandOptions.linkCli) {
      linkCli = new LinkCli({
        ui: this.ui,
        analytics: this.analytics,
        project: this.project
      });
    }

    let bowerInstall: any;
    if (!commandOptions.skipBower) {
      bowerInstall = new this.tasks.BowerInstall({
        ui: this.ui,
        analytics: this.analytics,
        project: this.project
      });
    }

    const project = this.project;
    const packageName = commandOptions.name !== '.' && commandOptions.name || project.name();

    if (!packageName) {
      const message = 'The `ng ' + this.name + '` command requires a ' +
        'package.json in current folder with name attribute or a specified name via arguments. ' +
        'For more details, use `ng help`.';

      return Promise.reject(new SilentError(message));
    }

    const blueprintOpts = {
      dryRun: commandOptions.dryRun,
      blueprint: 'ng2',
      rawName: packageName,
      targetFiles: rawArgs || '',
      rawArgs: rawArgs.toString(),
      sourceDir: commandOptions.sourceDir,
      style: commandOptions.style,
      prefix: commandOptions.prefix,
      mobile: commandOptions.mobile,
      routing: commandOptions.routing,
      inlineStyle: commandOptions.inlineStyle,
      inlineTemplate: commandOptions.inlineTemplate,
      ignoredUpdateFiles: ['favicon.ico']
    };

    if (!validProjectName(packageName)) {
      return Promise.reject(
        new SilentError('We currently do not support a name of `' + packageName + '`.'));
    }

    blueprintOpts.blueprint = normalizeBlueprint(blueprintOpts.blueprint);

    return installBlueprint.run(blueprintOpts)
      .then(function () {
        if (commandOptions.skipGit === false) {
          return gitInit.run(commandOptions, rawArgs);
        }
      }.bind(this))
      .then(function () {
        if (!commandOptions.skipNpm) {
          return npmInstall.run();
        }
      })
      .then(function () {
        if (commandOptions.linkCli) {
          return linkCli.run();
        }
      })
      .then(function () {
        if (!commandOptions.skipBower) {
          return bowerInstall.run({
            verbose: commandOptions.verbose
          });
        }
      });
  }
});

InitCommand.overrideCore = true;
export default InitCommand;
