import * as path from 'path';
import * as fs from 'fs';
import { oneLine } from 'common-tags';

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

function generateOptionVar(opts: any): String {
  const output: String[] = [];

  for (let index = 0; index < opts.length; index++) {
    const element = opts[index];
    output.push('--' + element.name);
    if (element.aliases) {
      output.push('-' + element.aliases[0]);
    }
  }

  return output.sort().join(' ');
}

function collectCommandAndAlias(command: any): String {
  const result: String[] = [];
  optsNg.push(command.name);
  result.push(command.name);

  if (command.aliases) {
    command.aliases.forEach((element: String) => {
      optsNg.push(element);
      result.push(element);
    });
  }
  return result.sort().join('|');
}

const optsNg: String[] = [];

const caseBuild = collectCommandAndAlias(BuildCommand.prototype);
optsNg.push('completion');
// const case_destroy = collectCommandAndAlias(DestroyCommand.prototype);
// const case_doc = collectCommandAndAlias(DocCommand.prototype);
// const case_e2e = collectCommandAndAlias(E2eCommand.prototype);
// const caseGenerate = collectCommandAndAlias(GenerateCommand.prototype);
const caseGenerate = 'g|generate';
// const caseGet = collectCommandAndAlias(GetCommand.prototype);
const caseGhPagesDeploy = collectCommandAndAlias(githubPagesDeployCommand.prototype);
const caseHelp = collectCommandAndAlias(HelpCommand.prototype);
const caseInit = collectCommandAndAlias(InitCommand.prototype);
const caseLint = collectCommandAndAlias(LintCommand.prototype);
// const caseMakethisawesome = collectCommandAndAlias(MakeThisAwesomeCommand.prototype);
const caseNew = collectCommandAndAlias(NewCommand.prototype);
const caseServe = collectCommandAndAlias(ServeCommand.prototype);
const caseSet = collectCommandAndAlias(SetCommand.prototype);
const caseTest = collectCommandAndAlias(NgCliTestCommand.prototype);
const caseVersion = collectCommandAndAlias(VersionCommand.prototype);

const optsHelp = optsNg.sort().join(' ');

let optsBuild = generateOptionVar(BuildCommand.prototype.availableOptions);
// let optsGenerate = generateMapVar (GenerateCommand.prototype.aliasMap);
let optsGenerate = oneLine`
    cl class c component d directive e enum i interface m module p pipe r route s service`;
let optsGhPagesDeploy = generateOptionVar(githubPagesDeployCommand.prototype.availableOptions);
let optsInit = generateOptionVar(InitCommand.prototype.availableOptions);
let optsNew = generateOptionVar(NewCommand.prototype.availableOptions);
let optsServe = generateOptionVar(ServeCommand.prototype.availableOptions);
let optsSet = generateOptionVar(SetCommand.prototype.availableOptions);
let optsTest = generateOptionVar(NgCliTestCommand.prototype.availableOptions);
let optsVersion = generateOptionVar(VersionCommand.prototype.availableOptions);

function displayCaseBlock () {
  console.log(`
      ng|help) opts="${optsHelp}" ;;
      ${caseBuild}) opts="${optsBuild}" ;;
      completion) opts="-a -b --all --bash --zsh" ;;
      ${caseGenerate}) opts="${optsGenerate}" ;;
      ${caseGhPagesDeploy}) opts="${optsGhPagesDeploy}" ;;
      ${caseInit}) opts="${optsInit}" ;;
      ${caseNew}) opts="${optsNew}" ;;
      ${caseServe}) opts="${optsServe}" ;;
      ${caseSet}) opts="${optsSet}" ;;
      ${caseTest}) opts="${optsTest}" ;;
      ${caseVersion}) opts="${optsVersion}" ;;
      *) opts="" ;;`);
}

export interface CompletionCommandOptions {
  all?: boolean;
  bash?: boolean;
  zsh?: boolean;
};

const CompletionCommand = Command.extend({
  name: 'completion',
  description: 'Adds autocomplete functionality to `ng` commands and subcommands',
  works: 'everywhere',
  availableOptions: [
    { name: 'all',   type: Boolean, default: true,  aliases: ['a'] },
    { name: 'bash',  type: Boolean, default: false, aliases: ['b'] },
    { name: 'zsh',   type: Boolean, default: false, aliases: ['z'] }
  ],

  run: function (commandOptions: CompletionCommandOptions, rawArgs: string[]) {
    commandOptions.all = !commandOptions.bash && !commandOptions.zsh;

    console.log(`
###-begin-ng-completion###');
#

# ng command completion script
#   This command supports 3 cases.
#   1. (Default case) It prints a common completion initialisation for both Bash and Zsh.
#      It is the result of either calling "ng completion" or "ng completion -a".
#   2. Produce Bash-only completion: "ng completion -b" or "ng completion --bash".
#   3. Produce Zsh-only completion: "ng completion -z" or "ng completion --zsh".
#
# Installation: ng completion -b 1>> ~/.bashrc
#           or  ng completion -z 1>> ~/.zshrc
#`);

    if (commandOptions.all && !commandOptions.bash) {
      console.log(`
if test ".$(type -t complete 2>/dev/null || true)" = ".builtin"; then`);
    }

    if (commandOptions.all || commandOptions.bash) {
      console.log(`
  _ng_completion() {
    local cword pword opts

    COMPREPLY=()
    cword=\${COMP_WORDS[COMP_CWORD]}
    pword=\${COMP_WORDS[COMP_CWORD - 1]}

    case \${pword} in`);

    displayCaseBlock();

    console.log(`
    esac

    COMPREPLY=( $(compgen -W '\${opts}' -- $cword) )

    return 0
  }

  complete -o default -F _ng_completion ng`);
    }

    if (commandOptions.all) {
      console.log(`
elif test ".$(type -w compctl 2>/dev/null || true)" = ".compctl: builtin" ; then`);
    }

    if (commandOptions.all || commandOptions.zsh) {
      console.log(`
  _ng_completion () {
    local words cword opts
    read -Ac words
    read -cn cword
    let cword-=1

    case $words[cword] in`);

    displayCaseBlock();

    console.log(`
    esac

    setopt shwordsplit
    reply=($opts)
    unset shwordsplit
  }

  compctl -K _ng_completion ng`);
    }

    if (commandOptions.all) {
      console.log(`
else
  echo "Shell builtin command 'complete' or 'compctl' is redefined; cannot perform ng completion."
  return 1
fi`);
    }

    console.log(`
###-end-ng-completion###
`);
  }
});

export default CompletionCommand;
