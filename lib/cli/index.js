var cli  = require('ember-cli/lib/cli');
var path = require('path');
var fs   = require('fs');

var internalAddonDir = path.join(__dirname, '..', '..', 'addon');

module.exports = function (options) {

    var internalAddonPaths = fs.readdirSync(internalAddonDir).map(function (file) {
        return path.join(internalAddonDir, file);
    });

    options.cli = {
        name: 'wrenchjs',
        cliRoot: path.join(__dirname, '..', '..'),
        internalAddonPaths: internalAddonPaths
    };
    return cli(options);
};