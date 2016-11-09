'use strict';

var Command = require('../models/command');

module.exports = Command.extend({
  name: 'asset-sizes',
  description: 'Shows the sizes of your asset files.',

  availableOptions: [
    { name: 'output-path', type: 'Path', default: 'dist/',       aliases: ['o'] },
  ],

  run: function(commandOptions) {
    var task = new this.tasks.ShowAssetSizes({
      ui: this.ui
    });
    return task.run(commandOptions);
  }
});
