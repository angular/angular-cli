var stringUtils = require('ember-cli/lib/utilities/string');
var fs = require('fs');

module.exports = {
  description: 'Generates a component.',

  //locals: function(options) {
  //   // Return custom template variables here.
  //   return {
  //
  //   };
  //}

  afterInstall: function(options) {
    switch (options.style) {
      case 'less':
        fs.renameSync(options.project.root + '/src/app/components/' + options.args[1] + '/' + options.args[1] + '.css', options.project.root + '/src/app/components/' + options.args[1] + '/' + options.args[1] + '.less');
    }
  }
};
