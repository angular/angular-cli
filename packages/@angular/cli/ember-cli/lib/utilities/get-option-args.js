'use strict';

module.exports = function(option, commandArgs) {
  let results = [], value, i;
  let optionIndex = commandArgs.indexOf(option);
  if (optionIndex === -1) { return results; }

  for (i = optionIndex + 1; i < commandArgs.length; i++) {
    value = commandArgs[i];
    if (/^\-+/.test(value)) { break; }
    results.push(value);
  }

  return results;
};
