'use strict';

const UnknownCommand = require('../commands/unknown');

module.exports = function(commands, commandName, commandArgs, optionHash) {

  function aliasMatches(alias) {
    return alias === commandName;
  }

  function findCommand(commands, commandName) {
    for (let key in commands) {
      let command = commands[key];

      let name = command.prototype.name;
      let aliases = command.prototype.aliases || [];

      if (name === commandName || aliases.some(aliasMatches)) {
        return command;
      }
    }
  }

  // Attempt to find command in ember-cli core commands
  let command = findCommand(commands, commandName);

  if (command) {
    return command;
  }

  // if we didn't find anything, return an "UnknownCommand"
  return class extends UnknownCommand {
    constructor(options) {
      super(options);
      this.name = commandName;
    }
  };
};
