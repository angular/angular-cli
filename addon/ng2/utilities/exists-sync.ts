import * as fs from 'fs';

module.exports = function(path) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
};
