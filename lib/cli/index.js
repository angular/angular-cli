var cli  = require('ember-cli/lib/cli');
var path = require('path');
var fs   = require('fs');

module.exports = function (options) {

    options.cli = {
        name: 'wrenchjs',
        root: path.join(__dirname, '..', '..'),
        npmPackage: 'wrenchjs'
    };
    return cli(options);
};