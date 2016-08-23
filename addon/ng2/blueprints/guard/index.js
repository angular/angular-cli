const SilentError = require('silent-error');
const path = require('path');
const util = require('../../utilities/route-utils');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');

module.exports = {
  description: 'Generate guard',

  availableOptions: [
    { name: 'can-activate', type: Boolean, default: false, aliases: ['ca'] },
    { name: 'can-deactivate', type: Boolean, default: false, aliases: ['cd'] },
    { name: 'can-activate-child', type: Boolean, default: false, aliases: ['cach'] },
    { name: 'route', type: String },
    { name: 'name', type: String }
  ],

  normalizeEntityName: function(entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);
    this.dynamicPath = parsedPath;
    this.guardPath = entityName;
    this.entityName = path.parse(entityName).name.split('.')[0];
    return this.entityName;
  },

  locals: function(options) {
    var activate = options.canActivate;
    var deactivate = options.canDeactivate;
    var activateChild = options.canActivateChild;
    // make sure only one option is selected
    if (activate + deactivate + activateChild !== 1) {
      throw new SilentError('Please choose only one of the aliases ca, cd, cach');
    }
    this.hook = activate ? 'Activate' : ( deactivate ? 'Deactivate' : 'ActivateChild');
    var customVariables = {
      hook: this.hook,
      route: activate || deactivate ? 'route' : 'childRoute'
    };
    if (options.name) {
      customVariables['classifiedModuleName'] = options.name;
    }
    return customVariables;
  },

  fileMapTokens: function() {
    return {
      __name__: () => this.entityName,
      __path__: () => this.dynamicPath.dir
    }
  },

  beforeInstall: function() {
    this.importPath  = this.guardPath[0] === path.sep ?
      path.resolve(path.join(this.project.root, 'src', 'app', this.guardPath)) : 
      path.join(process.env.PWD, this.guardPath);
    if (this.importPath.indexOf('src' + path.sep + 'app') === -1) {
      throw new SilentError('Guard must be within app');
    }

  },
  // TODO: resolve import path and disallow duplicate guards
  afterInstall: function(options) {
    return this._locals(options)
    .then(names => {
      var mainFile = path.join(this.project.root, 'src', 'main.ts');
      var routesFile = path.join(this.project.root, 'src', 'routes.ts');
      var importPath = '.' + this.importPath.replace(path.join(this.project.root, 'src'), '');
      
      var imports = {};
      var toInsert = {};
      var importedClass = names.classifiedModuleName;
      imports[importedClass] = [ `${importPath}.service` ];
      var route = this.guardPath.split('/').filter(n => n !== '').join('/') // strip outer slashes
      toInsert[route] = [ `can${this.hook}`, `[ ${importedClass} ]` ];
      var updateRoutesFile = util.addItemsToRouteProperties(routesFile, toInsert);
      updateRoutesFile.concat(util.insertImport(routesFile, importedClass, importPath));

      return util.applyChanges(updateRoutesFile)
      .then(() => util.applyChanges(util.bootstrapItem(mainFile, imports, importedClass)));
    });
  }
}


// .then(function() {
//         return ng(['generate', 'guard', '/test-route', '--ca'])
//       }).then(function() {
//         var mainFileContent = fs.readFileSync(mainFile, 'utf8');
//         var routesFileContent = fs.readFileSync(routesFile, 'utf8');
//         expect(mainFileContent).to.contain('import { TestRoute } from \'./app/test-route/test-route.service.ts\'');
//         if (!isMobileTest()){
//           expect(mainFileContent).to.contain('bootstrap(AppComponent, [ provideRouter(routes), TestRoute ])');
//         } else {
//           expect(mainFileContent).to.contain('bootstrap(AppComponent, [ APP_SHELL_RUNTIME_PROVIDERS, provideRouter(routes), TestRoute ])');
//         }

//         expect(routesFileContent).to.contain('import { TestRoute } from \'./app/test-route/test-route.service.ts\'');
//         expect(routesFileContent).to.contain('[\n  { path: \'test-route\', component: TestRouteComponent: canActivate: [TestRoute] }\n ]')
//       })
//     })