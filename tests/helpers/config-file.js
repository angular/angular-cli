const fs = require('fs-extra');

const readConfigFile = () => {
  return JSON.parse(fs.readFileSync('.angular-cli.json', 'utf8'));
};

module.exports = readConfigFile;