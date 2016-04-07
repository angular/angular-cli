var fs = require('fs-extra');
var path = require('path');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');

var imports, routeDefinitions;

module.exports = {
  description: 'Registers the route with the router.',

  normalizeEntityName: function () {
    var parsedPath = dynamicPathParser(this.project, 'ignore');

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  beforeInstall: function (options) {
    var routeConfigPath = path.join(options.project.root, 'src', 'client', 'app', 'route-config.ts');
    try {
      fs.unlinkSync(routeConfigPath);
    } catch (e) {
      //  doing nothing here
    }
  },

  locals: function (options) {
    return generateLocals.call(this, options);
  },

  fileMapTokens: function () {
    // Return custom template variables here.
    return {
      __path__: () => {
        return this.dynamicPath.dir;
      }
    };
  }
};

function generateLocals(options) {
  var ngCliConfigPath = path.join(options.project.root, 'angular-cli.json');
  var ngCliConfig = JSON.parse(fs.readFileSync(ngCliConfigPath, 'utf-8'));

  imports =
    ngCliConfig.routes.map(route => `import {${route.component}} from '${route.componentPath}';`)
      .join('\n');

  routeDefinitions =
    ngCliConfig.routes
      .map(
        route =>
          `{path: '${route.routePath}', name: '${route.component}', component: ${route.component}},`)
      .join('\n');

  return { imports, routeDefinitions }
}
