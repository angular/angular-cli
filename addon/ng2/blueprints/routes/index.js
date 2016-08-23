const Blueprint = require('ember-cli/lib/models/blueprint');
const getFiles = Blueprint.prototype.files;
const path = require('path');
const fs = require('fs');
var chalk = require('chalk');
const util = require('../../utilities/route-utils');
const SilentError = require('silent-error');

module.exports = {
  description: 'Generates a route and template',

  availableOptions: [
    { name: 'default', type: Boolean, default: false },
    { name: 'route', type: String },
    { name: 'parent', type: String, default: '' },
    { name: 'outlet', type: Boolean, default: false },
    { name: 'with-component', type: Boolean, default: false, aliases: ['wc'] } // isn't functional yet
  ],

  beforeInstall: function(options){
    this._locals(options)
    .then(names => {
      var directory = this.newRoutePath[0] === path.sep ? 
                      path.resolve(path.join(this.project.root, 'src', 'app', this.newRoutePath)):
                      path.resolve(process.env.PWD, this.newRoutePath);
      // get route to be used in routes.ts
      var route = directory.replace(path.join(this.project.root, 'src', 'app'), '');
      var parsedRoute = path.parse(route);
      var routeName = parsedRoute.name.split('.')[0];
      // take care of the cases /**/home/home.component.ts vs /**/home
      route = routeName === path.parse(parsedRoute.dir).name ?
              path.parse(route).dir : `${parsedRoute.dir}/${routeName}`;
      // setup options needed for adding path to routes.ts
      this.pathOptions = {
        isDefault: options.default,
        route: options.route || route,
        parent: options.parent,
        outlet: options.outlet,
        component: `${names.classifiedModuleName}Component`,
        dasherizedName: names.dasherizedModuleName,
        mainFile: path.join(this.project.root, 'src/main.ts'),
        routesFile: path.join(this.project.root, 'src/routes.ts')
      };
    });
  },

  files: function() {
    var fileList = getFiles.call(this);
    if (this.project && fs.existsSync(path.join(this.project.root, 'src/routes.ts'))) {
      return [];
    }
    return fileList;
  },

  fileMapTokens: function() {
    return { 
      __path__: () => 'src'
    };
  },

  normalizeEntityName: function(entityName) {
    this.newRoutePath = entityName
    entityName =  path.parse(entityName).name;
    if (!entityName) {
      throw new SilentError('Please provide new route\'s name');
    }
    return entityName.split('.')[0];
  },

  afterInstall: function() {
    return Promise.resolve().then(() => {
      // confirm componentFile and presence of export of the component in componentFile
      var component = this.pathOptions.component;
      var file = util.resolveComponentPath(this.project.root, process.env.PWD, this.newRoutePath);
      if (!util.confirmComponentExport(file, component)) {
        throw new SilentError(`Please add export for '${component}' to '${file}'`);
      }
      return Promise.resolve();
    }).then(() => {
      // update routes in routes.ts
      return util.applyChanges(util.addPathToRoutes(this.pathOptions.routesFile, this.pathOptions));
    }).then(() => {
      // add import to routes.ts in main.ts
      return util.applyChanges(
        [util.insertImport(this.pathOptions.mainFile, 'routes', './routes', true)]);
    }).then(() => {
      // bootstrap routes
      var routes = { 'provideRouter': ['@angular/router'] };
      var toBootstrap = 'provideRouter(routes)';
      return util.applyChanges(util.bootstrapItem(this.pathOptions.mainFile, routes, toBootstrap)); 
    }).catch(e => {
      if (e.message.indexOf('Did not bootstrap') !== -1) {
        this._writeStatusToUI(chalk.yellow, e.message, '');
      } else {
        throw new SilentError(e.message);
      }
    });
  }
}
