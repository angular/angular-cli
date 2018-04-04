import * as path from 'path';

const cli = require('../../ember-cli/lib/cli');


function loadCommands() {
  return {
    'add': require('../../commands/add').default,
    'build': require('../../commands/build').default,
    'serve': require('../../commands/serve').default,
    'new': require('../../commands/new').default,
    'generate': require('../../commands/generate').default,
    'test': require('../../commands/test').default,
    'e2e': require('../../commands/e2e').default,
    'help': require('../../commands/help').default,
    'lint': require('../../commands/lint').default,
    'version': require('../../commands/version').default,
    'doc': require('../../commands/doc').default,
    'xi18n': require('../../commands/xi18n').default,
    'update': require('../../commands/update').default,
    'run': require('../../commands/run').default,

    // Easter eggs.
    'make-this-awesome': require('../../commands/easter-egg').default,

    // Configuration.
    'config': require('../../commands/config').default,
  };
}

export default function(options: any) {
  options.cli = {
    name: 'ng',
    root: path.join(__dirname, '..', '..'),
    npmPackage: '@angular/cli'
  };

  options.commands = loadCommands();

  // ensure the environemnt variable for dynamic paths
  process.env.PWD = path.normalize(process.env.PWD || process.cwd());
  process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..', '..');

  return cli(options);
}
