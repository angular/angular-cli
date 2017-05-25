'use strict';

module.exports = function(name) {
  if (!name) {
    return null;
  }

  const packageParts = name.split('/');
  return packageParts[(packageParts.length - 1)];
};
