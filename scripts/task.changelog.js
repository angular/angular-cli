var conventionalChangelog = require('conventional-changelog');
var fs = require('fs');

/**
 * This task is used to generate a changelog.
 */
module.exports = function (gulp) {
    return function () {
      return conventionalChangelog({
        preset: 'angular'
      }).pipe(fs.createWriteStream('CHANGELOG.md'));
    };
};
