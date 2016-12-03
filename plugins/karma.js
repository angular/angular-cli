// This file is necessary when using a linked universal-cli to this repo, meaning that
// require('universal-cli/plugins/karma') will load this file, and we just forward to
// the actual published file.
module.exports = require('../packages/universal-cli/plugins/karma');
