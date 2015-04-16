var cli  = require('ember-cli/lib/cli');
var path = require('path');

module.exports = function (options) {
    options.cli = {
        name: 'wrenchjs',
        cliRoot: path.join(__dirname, '..', '..')
    };
    return cli(options);
};