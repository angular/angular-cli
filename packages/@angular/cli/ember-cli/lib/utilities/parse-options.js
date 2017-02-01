'use strict';

var reduce = require('lodash/reduce');

module.exports = function parseOptions(args) {
  return reduce(args, function(result, arg) {
    var parts = arg.split(':');
    result[parts[0]] = parts.slice(1).join(':');
    return result;
  }, {});
};
