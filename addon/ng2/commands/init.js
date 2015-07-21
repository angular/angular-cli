'use strict';

var InitCommand = require('ember-cli/lib/commands/init');

module.exports = InitCommand .extend({
    availableOptions: [
        { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
        { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
        { name: 'blueprint', type: String, aliases: ['b'] },
        { name: 'skip-npm', type: Boolean, default: false, aliases: ['sn'] },
        { name: 'skip-bower', type: Boolean, default: true, aliases: ['sb'] },
        { name: 'name', type: String, default: '', aliases: ['n'] }
    ],

    _defaultBlueprint: function() {
        if (this.project.isEmberCLIAddon()) {
            return 'addon';
        } else {
            return 'ng2';
        }
    },
});

module.exports.overrideCore = true;
