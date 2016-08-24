import * as Command from 'ember-cli/lib/models/command';
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

  run: function (options) {
    const versions = process.versions;
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

    for (const module in versions) {
      if (options.verbose || alwaysPrint.indexOf(module) > -1) {
        this.printVersion(module, versions[module]);
      }
    }
  },

  printVersion: function (module, version) {
    this.ui.writeLine(module + ': ' + version);
  }
});


module.exports = VersionCommand;
module.exports.overrideCore = true;
