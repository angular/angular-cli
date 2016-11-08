'use strict';

var lookupCommand   = require('../cli/lookup-command');
var stringUtils     = require('ember-cli-string-utils');
var assign          = require('lodash/assign');
var GenerateCommand = require('../commands/generate');
var RootCommand     = require('./root-command');
var versionUtils    = require('./version-utils');
var emberCLIVersion = versionUtils.emberCLIVersion;

function JsonGenerator(options) {
  options = options || {};

  this.ui = options.ui;
  this.project = options.project;
  this.commands = options.commands;
  this.tasks = options.tasks;
}

JsonGenerator.prototype.generate = function(commandOptions, rawArgs) {
  var rootCommand = new RootCommand({
    ui: this.ui,
    project: this.project,
    commands: this.commands,
    tasks: this.tasks
  });

  var json = rootCommand.getJson(commandOptions);
  json.version = emberCLIVersion();
  json.commands = [];
  json.addons = [];

  if (rawArgs.length === 0) {
    Object.keys(this.commands).forEach(function(commandName) {
      this._addCommandHelpToJson(commandName, false, commandOptions, json);
    }, this);

    if (this.project.eachAddonCommand) {
      this.project.eachAddonCommand(function(addonName, commands) {
        this.commands = commands;

        var addonJson = { name: addonName };
        addonJson.commands = [];
        json.addons.push(addonJson);

        Object.keys(this.commands).forEach(function(commandName) {
          this._addCommandHelpToJson(commandName, false, commandOptions, addonJson);
        }, this);
      }.bind(this));
    }
  } else {
    // If args were passed to the help command,
    // attempt to look up the command for each of them.

    if (this.project.eachAddonCommand) {
      this.project.eachAddonCommand(function(addonName, commands) {
        assign(this.commands, commands);
      }.bind(this));
    }

    var multipleCommands = [GenerateCommand.prototype.name].concat(GenerateCommand.prototype.aliases);
    if (multipleCommands.indexOf(rawArgs[0]) > -1) {
      var command = rawArgs.shift();
      if (rawArgs.length > 0) {
        commandOptions.rawArgs = rawArgs;
      }
      rawArgs = [command];
    }

    // Iterate through each arg beyond the initial 'help' command,
    // and try to display usage instructions.
    rawArgs.forEach(function(commandName) {
      this._addCommandHelpToJson(commandName, true, commandOptions, json);
    }, this);
  }

  return json;
};


JsonGenerator.prototype._addCommandHelpToJson = function(commandName, single, options, json) {
  var command = this._lookupCommand(commandName);
  if ((!command.skipHelp || single) && !command.unknown) {
    json.commands.push(command.getJson(options));
  }
};

JsonGenerator.prototype._lookupCommand = function(commandName) {
  var Command = this.commands[stringUtils.classify(commandName)] ||
    lookupCommand(this.commands, commandName);

  return new Command({
    ui: this.ui,
    project: this.project,
    commands: this.commands,
    tasks: this.tasks
  });
};

module.exports = JsonGenerator;
