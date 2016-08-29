const Command = require('ember-cli/lib/models/command');
import * as path from 'path';
import * as child_process from 'child_process';

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
    const versions: any = process.versions;
    const pkg = require(path.resolve(__dirname, '..', '..', '..', 'package.json'));

    versions['os'] = process.platform + ' ' + process.arch;

    const alwaysPrint = ['node', 'os'];

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

    this.printVersion('angular-cli', ngCliVersion);

    for (const module of Object.keys(versions)) {
      if (options.verbose || alwaysPrint.indexOf(module) > -1) {
        this.printVersion(module, versions[module]);
      }
    }
  },

  printVersion: function (module: string, version: string) {
    this.ui.writeLine(module + ': ' + version);
  }
});


VersionCommand.overrideCore = true;
export default VersionCommand;
