import * as path from 'path';

const cli = require('../../ember-cli/lib/cli');


function loadCommands() {
  return {
    // Schematics commands.
    'add': require('../../commands/add').default,
    'new': require('../../commands/new').default,
    'generate': require('../../commands/generate').default,
    'update': require('../../commands/update').default,

    // Architect commands.
    'build': require('../../commands/build').default,
    'serve': require('../../commands/serve').default,
    'test': require('../../commands/test').default,
    'e2e': require('../../commands/e2e').default,
    'lint': require('../../commands/lint').default,
    'xi18n': require('../../commands/xi18n').default,
    'run': require('../../commands/run').default,

    // Disabled commands.
    'eject': require('../../commands/eject').default,

    // Easter eggs.
    'make-this-awesome': require('../../commands/easter-egg').default,

    // Other.
    'config': require('../../commands/config').default,
    'help': require('../../commands/help').default,
    'version': require('../../commands/version').default,
    'doc': require('../../commands/doc').default,
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
