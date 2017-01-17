const Command = require('../ember-cli/lib/models/command');
import * as path from 'path';
import * as child_process from 'child_process';
import * as chalk from 'chalk';

const VersionCommand = Command.extend({
  name: 'version',
  description: 'outputs angular-cli version',
  aliases: ['v', '--version', '-v'],
  works: 'everywhere',

  availableOptions: [{
    name: 'verbose',
    type: Boolean, 'default': false
  }],

  run: function (options: any) {
    let versions: any = process.versions;
    const pkg = require(path.resolve(__dirname, '..', 'package.json'));
    let projPkg: any;
    try {
      projPkg = require(path.resolve(this.project.root, 'package.json'));
    } catch (exception) {
      projPkg = undefined;
    }

    versions.os = process.platform + ' ' + process.arch;

    const alwaysPrint = ['node', 'os'];
    const roots = ['@angular/', '@ngtools/'];

    let ngCliVersion = pkg.version;
    if (!__dirname.match(/node_modules/)) {
      let gitBranch = '??';
      try {
        const gitRefName = '' + child_process.execSync('git symbolic-ref HEAD', {cwd: __dirname});
        gitBranch = path.basename(gitRefName.replace('\n', ''));
      } catch (e) {
      }

      ngCliVersion = `local (v${pkg.version}, branch: ${gitBranch})`;
    }

    if (projPkg) {
      roots.forEach(root => {
        versions = Object.assign(versions, this.getDependencyVersions(projPkg, root));
      });
    }
    const asciiArt = `
                             _                           _  _
  __ _  _ __    __ _  _   _ | |  __ _  _ __         ___ | |(_)
 / _\` || '_ \\  / _\` || | | || | / _\` || '__|_____  / __|| || |
| (_| || | | || (_| || |_| || || (_| || |  |_____|| (__ | || |
 \\__,_||_| |_| \\__, | \\__,_||_| \\__,_||_|          \\___||_||_|
               |___/`;
    this.ui.writeLine(chalk.red(asciiArt));
    this.printVersion('angular-cli', ngCliVersion);

    for (const module of Object.keys(versions)) {
      const isRoot = roots.some(root => module.startsWith(root));
      if (options.verbose || alwaysPrint.indexOf(module) > -1 || isRoot) {
        this.printVersion(module, versions[module]);
      }
    }
  },

  getDependencyVersions: function(pkg: any, prefix: string): any {
    const modules: any = {};

    Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.devDependencies || {}))
      .filter(depName => depName && depName.startsWith(prefix))
      .forEach(key => modules[key] = this.getVersion(key));

    return modules;
  },

  getVersion: function(moduleName: string): string {
    const modulePkg = require(path.resolve(
      this.project.root,
      'node_modules',
      moduleName,
      'package.json'));
    return modulePkg.version;
  },

  printVersion: function (module: string, version: string) {
    this.ui.writeLine(module + ': ' + version);
  }
});


VersionCommand.overrideCore = true;
export default VersionCommand;
