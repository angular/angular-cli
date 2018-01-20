const s = require('@angular-devkit/schematics');

exports.default = function(options) {
  return s.chain([s.mergeWith(s.apply(
    s.url('./files'), [s.template({}), s.move(options.name)]))]);
};
