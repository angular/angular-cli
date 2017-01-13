import * as path from 'path';
import * as fs from 'fs';

import BuildCommand from './build';
import DestroyCommand from './destroy';
import DocCommand from './doc';
import E2eCommand from './e2e';
import MakeThisAwesomeCommand from './easter-egg';
import GenerateCommand from '../commands/generate';
import GetCommand from './get';
import githubPagesDeployCommand from './github-pages-deploy';
import HelpCommand from './help';
import InitCommand from './init';
import LintCommand from './lint';
import NewCommand from './new';
import ServeCommand from './serve';
import SetCommand from './set';
import NgCliTestCommand from './test';
import VersionCommand from './version';

const Command = require('../ember-cli/lib/models/command');

function generateOptionVar(opts: any, name: String) {
  // console.log (opts);
  let output: String[] = [];

  for (let index = 0; index < opts.length; index++) {
    let element = opts[index];
    output.push('--' + element.name);
    if (element.aliases) {
      output.push('-' + element.aliases[0]);
    }
  }

  output = output.sort();
  console.log(name + '_opts=\'' + output.join(' ') + '\'');
}

function generateMapVar(map: Map<String, String>, name: String) {
  console.log(map);
  let output: String[] = [];

  map.forEach((key, value) => {
    output.push(key);
    output.push(value);
  });

  output = output.sort();
  console.log(name + '_opts=\'' + output.join(' ') + '\'');
}

const ngOpts: String[] = [];

function collectCommandAndAlias(command: any) {
  ngOpts.push(command.name);

  if (command.aliases) {
    command.aliases.forEach((element: String) => {
      ngOpts.push(element);
    });
  }
}

const CompletionCommand = Command.extend({
  name: 'completion',
  description: 'Adds autocomplete functionality to `ng` commands and subcommands',
  works: 'everywhere',
  run: function() {
    console.log('###-begin-ng-completion###');
    console.log('#');
    console.log('# ng command completion script');
    console.log('#');
    console.log('# Installation: ng completion 1>> ~/.bashrc 2>>&1');
    console.log('#           or  ng completion 1>> ~/.zshrc 2>>&1');
    console.log('#');
    console.log('');

    collectCommandAndAlias(BuildCommand.prototype);
    ngOpts.push('completion');
    collectCommandAndAlias(DestroyCommand.prototype);
    collectCommandAndAlias(DocCommand.prototype);
    collectCommandAndAlias(E2eCommand.prototype);
    collectCommandAndAlias(GenerateCommand.prototype);
    collectCommandAndAlias(GetCommand.prototype);
    collectCommandAndAlias(githubPagesDeployCommand.prototype);
    collectCommandAndAlias(HelpCommand.prototype);
    collectCommandAndAlias(InitCommand.prototype);
    collectCommandAndAlias(LintCommand.prototype);
    collectCommandAndAlias(MakeThisAwesomeCommand.prototype);
    collectCommandAndAlias(NewCommand.prototype);
    collectCommandAndAlias(ServeCommand.prototype);
    collectCommandAndAlias(SetCommand.prototype);
    collectCommandAndAlias(NgCliTestCommand.prototype);
    collectCommandAndAlias(VersionCommand.prototype);
    console.log("ng_opts='" + ngOpts.sort().join(' ') + "'");
    console.log('');

    generateOptionVar(BuildCommand.prototype.availableOptions, 'build');
    // generateMapVar (GenerateCommand.prototype.aliasMap, 'generate');
    generateOptionVar(githubPagesDeployCommand.prototype.availableOptions, 'github_pages_deploy');
    generateOptionVar(InitCommand.prototype.availableOptions, 'init');
    generateOptionVar(NewCommand.prototype.availableOptions, 'new');
    generateOptionVar(ServeCommand.prototype.availableOptions, 'serve');
    generateOptionVar(SetCommand.prototype.availableOptions, 'set');
    generateOptionVar(NgCliTestCommand.prototype.availableOptions, 'test');
    generateOptionVar(VersionCommand.prototype.availableOptions, 'version');

    const scriptPath = path.resolve(__dirname, '..', 'utilities', 'completion.sh');
    const scriptOutput = fs.readFileSync(scriptPath, 'utf8');

    console.log(scriptOutput);
  }
});

export default CompletionCommand;
