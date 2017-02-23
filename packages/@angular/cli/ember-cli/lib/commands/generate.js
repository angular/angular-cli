'use strict';

var chalk                 = require('chalk');
var Command               = require('../models/command');
var Promise               = require('../ext/promise');
var Blueprint             = require('../models/blueprint');
var mergeBlueprintOptions = require('../utilities/merge-blueprint-options');
var merge                 = require('lodash/merge');
var reject                = require('lodash/reject');
var EOL                   = require('os').EOL;
var SilentError           = require('silent-error');

module.exports = Command.extend({
  name: 'generate',
  description: 'Generates new code from blueprints.',
  aliases: ['g'],
  works: 'insideProject',

  availableOptions: [
    { name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: 'Run through without making any changes.'
    },
    {
      name: 'verbose',
      type: Boolean,
      default: false,
      aliases: ['v'],
      description: 'Adds more details to output logging.'
    }
  ],

  anonymousOptions: [
    '<blueprint>'
  ],

  beforeRun: mergeBlueprintOptions,

  run: function(commandOptions, rawArgs) {
    var blueprintName = rawArgs[0];

    if (!blueprintName) {
      return Promise.reject(new SilentError('The `ng generate` command requires a ' +
                                            'blueprint name to be specified. ' +
                                            'For more details, use `ng help`.'));
    }
    var Task = this.tasks.GenerateFromBlueprint;
    var task = new Task({
      ui: this.ui,
      project: this.project,
      testing: this.testing,
      settings: this.settings
    });

    var taskArgs = {
      args: rawArgs
    };

    if (this.settings && this.settings.usePods && !commandOptions.classic) {
      commandOptions.pod = false;
    }

    var taskOptions = merge(taskArgs, commandOptions || {});

    if (this.project.initializeAddons) {
      this.project.initializeAddons();
    }

    return task.run(taskOptions);
  },

  printDetailedHelp: function(options) {
    this.ui.writeLine(this.getAllBlueprints(options));
  },

  addAdditionalJsonForHelp: function(json, options) {
    json.availableBlueprints = this.getAllBlueprints(options).filter(x => x.name !== 'ng');
  },

  getAllBlueprints: function(options) {
    var lookupPaths   = this.project.blueprintLookupPaths();
    var blueprintList = Blueprint.list({ paths: lookupPaths });

    var output = '';

    var singleBlueprintName;
    if (options.rawArgs) {
      singleBlueprintName = options.rawArgs[0];
    }

    if (!singleBlueprintName && !options.json) {
      output += EOL + '  Available blueprints:' + EOL;
    }

    var collectionsJson = [];

    blueprintList.forEach(function(collection) {
      var result = this.getPackageBlueprints(collection, options, singleBlueprintName);
      if (options.json) {
        var collectionJson = {};
        collectionJson[collection.source] = result;
        collectionsJson.push(collectionJson);
      } else {
        output += result;
      }
    }, this);

    if (singleBlueprintName && !output && !options.json) {
      output = chalk.yellow('The \'' + singleBlueprintName +
        '\' blueprint does not exist in this project.') + EOL;
    }

    if (options.json) {
      return collectionsJson;
    } else {
      return output;
    }
  },

  getPackageBlueprints: function(collection, options, singleBlueprintName) {
    var verbose    = options.verbose;
    var blueprints = collection.blueprints;

    if (!verbose) {
      blueprints = reject(blueprints, 'overridden');
    }

    var output = '';
    var blueprintsJson = [];

    blueprints.forEach(function(blueprint) {
      if (blueprint.name === 'ng') {
        // Skip
        return;
      }
      var singleMatch = singleBlueprintName === blueprint.name;
      if (singleMatch) {
        verbose = true;
      }
      if (!singleBlueprintName || singleMatch) {
        // this may add default keys for printing
        blueprint.availableOptions.forEach(this.normalizeOption);

        if (options.json) {
          blueprintsJson.push(blueprint.getJson(verbose));
        } else {
          output += blueprint.printBasicHelp(verbose) + EOL;
        }
      }
    }, this);

    if (options.json) {
      return blueprintsJson;
    } else {
      return output;
    }
  }
});
