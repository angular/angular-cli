'use strict';

const SilentError = require('silent-error');
const Blueprint = require('../models/blueprint');

/*
 * Helper for commands that use a blueprint to merge the blueprint's options
 * into the command's options so they can be passed in. Needs to be invoked
 * with `this` pointing to the command object, e.g.
 *
 * var mergeBlueprintOptions = require('../utilities/merge-blueprint-options');
 *
 * Command.extend({
 *   beforeRun: mergeBlueprintOptions
 * })
 */
module.exports = function(rawArgs) {
  if (rawArgs.length === 0) {
    return;
  }
  // merge in blueprint availableOptions
  let blueprint;
  try {
    blueprint = Blueprint.lookup(rawArgs[0], {
      paths: this.project.blueprintLookupPaths(),
    });
    this.registerOptions(blueprint);
  } catch (e) {
    SilentError.debugOrThrow(`ember-cli/commands/${this.name}`, e);
  }
};
