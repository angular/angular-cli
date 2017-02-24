// This file is necessary when using a linked @angular/cli to this repo, meaning that
// require('@angular/cli/plugins/karma') will load this file, and we just forward to
// the actual published file.
require('../lib/bootstrap-local');
module.exports = require('../packages/@angular/cli/plugins/karma');
