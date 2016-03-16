var fs = require('fs-extra');
var path = require('path');
var chalk = require('chalk');

var imports, routeDefinitions;

module.exports = {
  description: 'Registers the route with the router.',

  locals: function(options) {
    return generateLocals.call(this, options);
  },

  beforeInstall: function(options) {
    var routeConfigPath = path.join(options.project.root, 'src', 'app', 'route-config.ts');
    try {
      fs.unlinkSync(routeConfigPath);
    } catch (e) {}
  }
};

function generateLocals(options) {
  var ngCliConfigPath = path.join(options.project.root, 'angular-cli.json');
  var ngCliConfig = JSON.parse(fs.readFileSync(ngCliConfigPath, 'utf-8'));

  imports = ngCliConfig.routes.map(route =>
      `import {${route.component}} from '${route.componentPath}';`)
    .join('\n');

  routeDefinitions = ngCliConfig.routes.map(route =>
      `{path:'${route.routePath}', name: '${route.component}', component: ${route.component}},`
    )
    .join('\n');

  return {
    imports,
    routeDefinitions
  }
}
