var fs = require('fs-extra');
var path = require('path');
var chalk = require('chalk');

module.exports = {
  description: 'Generates a route and a template.',

  availableOptions: [{
    name: 'skip-router-generation',
    type: Boolean,
    default: false,
    aliases: ['srg']
  }, {
    name: 'default',
    type: Boolean,
    default: false
  }],

  beforeInstall: function (options, locals) {
    if (!options.skipRouterGeneration) {
      updateRouteConfig.call(this, 'add', options, locals);
    }
  },

  afterInstall: function (options, locals) {
    if (!options.skipRouterGeneration) {
      return this.lookupBlueprint('route-config')
        .install(options);
    }
  },

  beforeUninstall: function (options, locals) {
    updateRouteConfig.call(this, 'remove', options, locals);
  },

  afterUninstall: function (options, locals) {
    return this.lookupBlueprint('route-config')
      .install(options);
  }
};

function updateRouteConfig(action, options, locals) {
  var entity = options.entity;
  var actionColorMap = {
    add: 'green',
    remove: 'red'
  };
  var color = actionColorMap[action] || 'gray';

  this._writeStatusToUI(chalk[color], action + ' route', entity.name);

  var ngCliConfigPath = path.join(options.project.root, 'angular-cli.json');

  // TODO use default option
  var route = {
    routePath: `/${locals.dasherizedModuleName}/...`,
    component: `${locals.classifiedModuleName}Root`,
    componentPath: `./${locals.dasherizedModuleName}/${locals.dasherizedModuleName}-root.component`
  };

  var ngCliConfig = JSON.parse(fs.readFileSync(ngCliConfigPath, 'utf-8'));
  if (action === 'add' && ngCliConfig.routes.findIndex(el => el.routePath === route.routePath) === -1) {
    ngCliConfig.routes.push(route)
  } else if (action === 'remove') {
    var idx = ngCliConfig.routes.findIndex(el => el.routePath === route.routePath);
    if (idx > -1) {
      ngCliConfig.routes.splice(idx, 1);
    }
  }
  fs.writeFileSync(ngCliConfigPath, JSON.stringify(ngCliConfig, null, 2));
}