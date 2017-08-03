import * as fs from 'fs';
import * as path from 'path';

import { stripIndent } from 'common-tags';

const stringUtils = require('ember-cli-string-utils');
const Command = require('../ember-cli/lib/models/command');
const lookupCommand = require('../ember-cli/lib/cli/lookup-command');

function extractOptions(opts: any): string[] {
  const output: string[] = [];

  for (let index = 0; index < opts.length; index++) {
    const element = opts[index];
    output.push('--' + element.name);
    if (element.aliases) {
      output.push('-' + element.aliases[0]);
    }
  }

  return output;
}

function extractBlueprints(opts: any): string[] {
  const output: string[] = [];

  for (let index = 0; index < opts.length; index++) {
    const element = opts[index];
    output.push(element.name);
  }

  return output;
}

export interface CompletionCommandOptions {
  all?: boolean;
  bash?: boolean;
  zsh?: boolean;
}

const optsNg: string[] = [];

const CompletionCommand = Command.extend({
  name: 'completion',
  description: 'Adds autocomplete functionality to `ng` commands and subcommands.',
  works: 'everywhere',
  availableOptions: [
    {
      name: 'all',
      type: Boolean,
      default: true,
      aliases: ['a'],
      description: 'Generate a completion script compatible with both bash and zsh.'
    },
    {
      name: 'bash',
      type: Boolean,
      default: false,
      aliases: ['b'],
      description: 'Generate a completion script for bash.'
    },
    {
      name: 'zsh',
      type: Boolean,
      default: false,
      aliases: ['z'],
      description: 'Generate a completion script for zsh.'
    }
  ],

  run: function (commandOptions: CompletionCommandOptions) {
    commandOptions.all = !commandOptions.bash && !commandOptions.zsh;

    const commandFiles = fs.readdirSync(__dirname)
      .filter(file => file.match(/\.(j|t)s$/) && !file.match(/\.d.ts$/))
      .map(file => path.parse(file).name)
      .map(file => file.toLowerCase());

    const commandMap = commandFiles.reduce((acc: any, curr: string) => {
      let classifiedName = stringUtils.classify(curr);
      let defaultImport = require(`./${curr}`).default;

      acc[classifiedName] = defaultImport;

      return acc;
    }, {});

    let caseBlock = '';

    commandFiles.forEach(cmd => {
      const Command = lookupCommand(commandMap, cmd);
      const com: string[] = [];

      const command = new Command({
        ui: this.ui,
        project: this.project,
        commands: this.commands,
        tasks: this.tasks
      });

      if (command.hidden || command.unknown) {
        return;
      }

      optsNg.push(command.name);
      com.push(command.name);

      if (command.aliases) {
        command.aliases.forEach((element: string) => {
          optsNg.push(element);
          com.push(element);
        });
      }

      let opts: string[] = [];
      if (command.blueprints && command.blueprints[0]) {
        opts = opts.concat(extractBlueprints(command.blueprints));
      }

      if (command.availableOptions && command.availableOptions[0]) {
        opts = opts.concat(extractOptions(command.availableOptions));
        const optsStr = opts.sort().join(' ');
        caseBlock = `${caseBlock}
             ${com.sort().join('|')}) opts="${optsStr}" ;;`;
      }
    });

    caseBlock = `ng|help) opts="${optsNg.sort().join(' ')}" ;;${caseBlock}
             *) opts="" ;;`;

    console.log(stripIndent`
      ###-begin-ng-completion###
      #

      # ng command completion script
      #   This command supports 3 cases.
      #   1. (Default case) It prints a common completion initialisation for both Bash and Zsh.
      #      It is the result of either calling "ng completion" or "ng completion -a".
      #   2. Produce Bash-only completion: "ng completion -b" or "ng completion --bash".
      #   3. Produce Zsh-only completion: "ng completion -z" or "ng completion --zsh".
      #
      # Usage: . <(ng completion --bash) # place it appropriately in .bashrc or
      #        . <(ng completion --zsh) # find a spot for it in .zshrc
      #`);

    if (commandOptions.all && !commandOptions.bash) {
      console.log('if test ".$(type -t complete 2>/dev/null || true)" = ".builtin"; then');
    }

    if (commandOptions.all || commandOptions.bash) {
      console.log(stripIndent`
          _ng_completion() {
           local cword pword opts

           COMPREPLY=()
           cword=\${COMP_WORDS[COMP_CWORD]}
           pword=\${COMP_WORDS[COMP_CWORD - 1]}

           case \${pword} in
             ${caseBlock}
           esac

           COMPREPLY=( $(compgen -W '\${opts}' -- $cword) )

           return 0
         }

         complete -o default -F _ng_completion ng
         `);
    }

    if (commandOptions.all) {
      console.log(stripIndent`
        elif test ".$(type -w compctl 2>/dev/null || true)" = ".compctl: builtin" ; then
        `);
    }

    if (commandOptions.all || commandOptions.zsh) {
      console.log(stripIndent`
          _ng_completion () {
            local words cword opts
            read -Ac words
            read -cn cword
            let cword-=1

            case $words[cword] in
              ${caseBlock}
            esac

            setopt shwordsplit
            reply=($opts)
            unset shwordsplit
          }

          compctl -K _ng_completion ng
          `);
    }

    if (commandOptions.all) {
      console.log(stripIndent`
        else
          echo "Builtin command 'complete' or 'compctl' is redefined; cannot produce completion."
          return 1
        fi`);
    }

    console.log('###-end-ng-completion###');

  }
});

export default CompletionCommand;
