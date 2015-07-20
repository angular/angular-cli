'use strict';

var NewCommand = require('ember-cli/lib/commands/new');

module.exports = NewCommand.extend({
    availableOptions: [
        { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
        { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
        { name: 'blueprint', type: String, default: 'ng2', aliases: ['b'] },
        { name: 'skip-npm', type: Boolean, default: false, aliases: ['sn'] },
        { name: 'skip-bower', type: Boolean, default: true, aliases: ['sb'] },
        { name: 'skip-git', type: Boolean, default: false, aliases: ['sg'] },
        { name: 'directory', type: String , aliases: ['dir'] }
    ]
});

module.exports.overrideCore = true;
