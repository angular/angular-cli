/* jshint node: true, esversion: 6 */
'use strict';

module.exports = function(name) {
  try {
    return require(name);
  } catch (e) {
    return null;
  }
};
