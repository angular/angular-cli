import * as path from 'path';
import * as fs from 'fs';

const Command = require('../ember-cli/lib/models/command');

const CompletionCommand = Command.extend({
  name: 'completion',
  description: 'Adds autocomplete functionality to `ng` commands and subcommands',
  works: 'everywhere',
  run: function() {
    const scriptPath = path.resolve(__dirname, '..', 'utilities', 'completion.sh');
    const scriptOutput = fs.readFileSync(scriptPath, 'utf8');

    console.log(scriptOutput);
  }
});

export default CompletionCommand;
