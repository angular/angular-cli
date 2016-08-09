import * as mockFs from 'mock-fs';
import * as fs from 'fs';
import { expect } from 'chai';
import * as nru from '../../addon/ng2/utilities/route-utils';
import * as ts from 'typescript';
import * as path from 'path';
import { InsertChange, RemoveChange } from '../../addon/ng2/utilities/change';
import * as Promise from 'ember-cli/lib/ext/promise';
import * as _ from 'lodash';

const readFile = Promise.denodeify(fs.readFile);

describe('route utils', () => {
  describe('insertImport', () => {
    const sourceFile = 'tmp/tmp.ts';
    beforeEach(() => {
      let mockDrive = {
        'tmp': {
          'tmp.ts': ''
        }
      };
      mockFs(mockDrive);
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('inserts as last import if not present', () => {
      let content = `'use strict'\n import {foo} from 'bar'\n import * as fz from 'fizz';`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply()
      .then(() => nru.insertImport(sourceFile, 'Router', '@angular/router').apply())
      .then(() => readFile(sourceFile, 'utf8'))
      .then(newContent => {
        expect(newContent).to.equal(content + `\nimport { Router } from '@angular/router';`);
      });
    });
    it('does not insert if present', () => {
      let content = `'use strict'\n import {Router} from '@angular/router'`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply()
      .then(() => nru.insertImport(sourceFile, 'Router', '@angular/router'))
      .then(() => readFile(sourceFile, 'utf8'))
      .then(newContent => {
        expect(newContent).to.equal(content);
      });
    });
    it('inserts into existing import clause if import file is already cited', () => {
      let content = `'use strict'\n import { foo, bar } from 'fizz'`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply()
      .then(() => nru.insertImport(sourceFile, 'baz', 'fizz').apply())
      .then(() => readFile(sourceFile, 'utf8'))
      .then(newContent => {
        expect(newContent).to.equal(`'use strict'\n import { foo, bar, baz } from 'fizz'`);
      });
    });
    it('understands * imports', () => {
      let content = `\nimport * as myTest from 'tests' \n`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply()
      .then(() => nru.insertImport(sourceFile, 'Test', 'tests'))
      .then(() => readFile(sourceFile, 'utf8'))
      .then(newContent => {
        expect(newContent).to.equal(content);
      });
    });
    it('inserts after use-strict', () => {
      let content = `'use strict';\n hello`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply()
      .then(() => nru.insertImport(sourceFile, 'Router', '@angular/router').apply())
      .then(() => readFile(sourceFile, 'utf8'))
      .then(newContent => {
        expect(newContent).to.equal(
          `'use strict';\nimport { Router } from '@angular/router';\n hello`);
      });
    });
    it('inserts inserts at beginning of file if no imports exist', () => {
      return nru.insertImport(sourceFile, 'Router', '@angular/router').apply()
      .then(() => readFile(sourceFile, 'utf8'))
      .then(newContent => {
        expect(newContent).to.equal(`import { Router } from '@angular/router';\n`);
      });
    });
  });

  describe('bootstrapItem', () => {
    const mainFile = 'tmp/main.ts';
    const prefix = `import {bootstrap} from '@angular/platform-browser-dynamic'; \n` +
                    `import { AppComponent } from './app/';\n`;
    const routes = {'provideRouter': ['@angular/router'], 'routes': ['./routes', true]};
    const toBootstrap = 'provideRouter(routes)';
    const routerImport = `import routes from './routes';\n` +
                        `import { provideRouter } from '@angular/router'; \n`;
    beforeEach(() => {
      let mockDrive = {
        'tmp': {
          'main.ts': `import {bootstrap} from '@angular/platform-browser-dynamic'; \n` +
                    `import { AppComponent } from './app/'; \n` +
                    'bootstrap(AppComponent);'
        }
      };
      mockFs(mockDrive);
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('adds a provideRouter import if not there already', () => {
      return nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
                                'bootstrap(AppComponent, [ provideRouter(routes) ]);');
      });
    });
    it('does not add a provideRouter import if it exits already', () => {
      return nru.insertImport(mainFile, 'provideRouter', '@angular/router').apply()
      .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)));
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(
  `import routes from './routes';
  import { provideRouter } from '@angular/router'; 
  bootstrap(AppComponent, [ provideRouter(routes) ]);`);
      });
    });
    it('does not duplicate import to route.ts ', () => {
      let editedFile = new InsertChange(mainFile, 100, `\nimport routes from './routes';`);
      return editedFile
      .apply()
      .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
                'bootstrap(AppComponent, [ provideRouter(routes) ]);');
      });
    });
    it('adds provideRouter to bootstrap if absent and no providers array', () => {
      return nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
                'bootstrap(AppComponent, [ provideRouter(routes) ]);');
      });
    });
    it('adds provideRouter to bootstrap if absent and empty providers array', () => {
      let editFile = new InsertChange(mainFile, 124, ', []');
      return editFile.apply()
      .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
                                'bootstrap(AppComponent, [provideRouter(routes)]);');
      });
    });
    it('adds provideRouter to bootstrap if absent and non-empty providers array', () => {
      let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS ]');
      return editedFile.apply()
      .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
                              'bootstrap(AppComponent, [ HTTP_PROVIDERS, provideRouter(routes) ]);');
      });
    });
    it('does not add provideRouter to bootstrap if present', () => {
      let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS, provideRouter(routes) ]');
      return editedFile.apply()
      .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
                            'bootstrap(AppComponent, [ HTTP_PROVIDERS, provideRouter(routes) ]);');
      });
    });
    it('inserts into the correct array', () => {
      let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS, {provide: [BAR]}]');
      return editedFile.apply()
      .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
          'bootstrap(AppComponent, [ HTTP_PROVIDERS, {provide: [BAR]}, provideRouter(routes)]);');
      });
    });
    it('throws an error if there is no or multiple bootstrap expressions', () => {
      let editedFile = new InsertChange(mainFile, 126, '\n bootstrap(moreStuff);');
      return editedFile.apply()
      .then(() => nru.bootstrapItem(mainFile, routes, toBootstrap))
      .catch(e =>
        expect(e.message).to.equal('Did not bootstrap provideRouter in' +
                                  ' tmp/main.ts because of multiple or no bootstrap calls')
      );
    });
    it('configures correctly if bootstrap or provide router is not at top level', () => {
      let editedFile = new InsertChange(mainFile, 126, '\n if(e){bootstrap, provideRouter});');
      return editedFile.apply()
      .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
      .then(() => readFile(mainFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(prefix + routerImport +
        'bootstrap(AppComponent, [ provideRouter(routes) ]);\n if(e){bootstrap, provideRouter});');
      });
    });
  });

  describe('addPathToRoutes', () => {
    const routesFile = 'src/routes.ts';
    var options = {dir: 'src/app', appRoot: 'src/app', routesFile: routesFile,
                  component: 'NewRouteComponent', dasherizedName: 'new-route'};
    const nestedRoutes = `\n  { path: 'home', component: HomeComponent,
    children: [
      { path: 'about', component: AboutComponent,
        children: [
          { path: 'more', component: MoreComponent }
        ]
      }
    ]
  }\n`;
    beforeEach(() => {
      let mockDrive = {
        'src': {
          'routes.ts' : 'export default [];'
        }
      };
      mockFs(mockDrive);
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('adds import to new route component if absent', () => {
      return nru.applyChanges(nru.addPathToRoutes(routesFile, _.merge({route: 'new-route'}, options)))
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(
  `import { NewRouteComponent } from './app/new-route/new-route.component';
export default [\n  { path: 'new-route', component: NewRouteComponent }\n];`);
      });
    });
    it('throws error if multiple export defaults exist', () => {
      let editedFile = new InsertChange(routesFile, 20, 'export default {}');
      return editedFile.apply().then(() => {
        return nru.addPathToRoutes(routesFile, _.merge({route: 'new-route'}, options));
      }).catch(e => {
        expect(e.message).to.equal('Did not insert path in routes.ts because '
                  + `there were multiple or no 'export default' statements`);
      });
    });
    it('throws error if no export defaults exists', () => {
      let editedFile = new RemoveChange(routesFile, 0, 'export default []');
      return editedFile.apply().then(() => {
        return nru.addPathToRoutes(routesFile, _.merge({route: 'new-route'}, options));
      }).catch(e => {
        expect(e.message).to.equal('Did not insert path in routes.ts because '
                  + `there were multiple or no 'export default' statements`);
      });
    });
    it('treats positional params correctly', () => {
      let editedFile = new InsertChange(routesFile, 16,
                        `\n  { path: 'home', component: HomeComponent }\n`);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'about';
        options.component = 'AboutComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/:id'}, options))); })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(
                      `import { AboutComponent } from './app/home/about/about.component';` +
                      `\nexport default [\n` +
                      `  { path: 'home', component: HomeComponent,\n` +
                      `    children: [\n` +
                      `      { path: 'about/:id', component: AboutComponent } ` +
                      `\n    ]\n  }\n];`);
      });
    });
    it('inserts under parent, mid', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'details';
        options.component = 'DetailsComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/details'}, options))); })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        let expected =   `import { DetailsComponent } from './app/home/about/details/details.component';
export default [
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'about', component: AboutComponent,
        children: [
          { path: 'details', component: DetailsComponent }, 
          { path: 'more', component: MoreComponent }
        ]
      }
    ]
  }\n];`;
        expect(content).to.equal(expected);
      });
    });
    it('inserts under parent, deep', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'sections';
        options.component = 'SectionsComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/more/sections'}, options))); })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        let expected = `import { SectionsComponent } from './app/home/about/more/sections/sections.component';
export default [
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'about', component: AboutComponent,
        children: [
          { path: 'more', component: MoreComponent,
            children: [
              { path: 'sections', component: SectionsComponent } 
            ]
          }
        ]
      }
    ]
  }
];`;
        expect(content).to.equal(expected);
      });
    });
    it('works well with multiple routes in a level', () => {
      let paths = `\n  { path: 'main', component: MainComponent }
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'about', component: AboutComponent }
    ]
  }\n`;
      let editedFile = new InsertChange(routesFile, 16, paths);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'about';
        options.component = 'AboutComponent_1';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/:id'}, options))); })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(`import { AboutComponent_1 } from './app/home/about/about.component';
export default [
  { path: 'main', component: MainComponent }
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'about/:id', component: AboutComponent_1 }, 
      { path: 'about', component: AboutComponent }
    ]
  }
];`
        );
      });
    });
    it('throws error if repeating child, shallow', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'home';
        options.component = 'HomeComponent';
          return nru.addPathToRoutes(routesFile, _.merge({route: '/home'}, options));
      }).catch(e => {
        expect(e.message).to.equal('Route was not added since it is a duplicate');
      });
    });
    it('throws error if repeating child, mid', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'about';
        options.component = 'AboutComponent';
          return nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/'}, options));
      }).catch(e => {
        expect(e.message).to.equal('Route was not added since it is a duplicate');
      });
    });
    it('throws error if repeating child, deep', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'more';
        options.component = 'MoreComponent';
          return nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/more'}, options));
      }).catch(e => {
        expect(e.message).to.equal('Route was not added since it is a duplicate');
      });
    });
    it('does not report false repeat', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'more';
        options.component = 'MoreComponent';
        return nru.applyChanges(nru.addPathToRoutes(routesFile, _.merge({route: 'more'}, options)));
      })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        let expected =   `import { MoreComponent } from './app/more/more.component';
export default [
  { path: 'more', component: MoreComponent },
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'about', component: AboutComponent,
        children: [
          { path: 'more', component: MoreComponent }
        ]
      }
    ]
  }\n];`;
    expect(content).to.equal(expected);
      });
    });
    it('does not report false repeat: multiple paths on a level', () => {

      let routes = `\n  { path: 'home', component: HomeComponent,
    children: [
      { path: 'about', component: AboutComponent,
        children: [
          { path: 'more', component: MoreComponent }
        ]
      }
    ]
  },\n  { path: 'trap-queen', component: TrapQueenComponent}\n`;

      let editedFile = new InsertChange(routesFile, 16, routes);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'trap-queen';
        options.component = 'TrapQueenComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/trap-queen'}, options))); })
      .then(() => readFile(routesFile, 'utf8')
      .then(content => {
        let expected = `import { TrapQueenComponent } from './app/home/trap-queen/trap-queen.component';
export default [
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'trap-queen', component: TrapQueenComponent }, 
      { path: 'about', component: AboutComponent,
        children: [
          { path: 'more', component: MoreComponent }
        ]
      }
    ]
  },\n  { path: 'trap-queen', component: TrapQueenComponent}\n];`;
        expect(content).to.equal(expected);
      });
    });
    it('resolves imports correctly', () => {
      let editedFile = new InsertChange(routesFile, 16,
                       `\n  { path: 'home', component: HomeComponent }\n`);
      return editedFile.apply().then(() => {
        let editedFile = new InsertChange(routesFile, 0,
                         `import { HomeComponent } from './app/home/home.component';\n`);
        return editedFile.apply();
      })
      .then(() => {
        options.dasherizedName = 'home';
        options.component = 'HomeComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/home'}, options))); })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        let expected = `import { HomeComponent } from './app/home/home.component';
import { HomeComponent as HomeComponent_1 } from './app/home/home/home.component';
export default [
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'home', component: HomeComponent_1 } 
    ]
  }
];`;
        expect(content).to.equal(expected);
      });
    });
    it('throws error if components collide and there is repitition', () => {
      let editedFile = new InsertChange(routesFile, 16,
`\n  { path: 'about', component: AboutComponent, 
    children: [
      { path: 'details/:id', component: DetailsComponent_1 },
      { path: 'details', component: DetailsComponent }
    ]
  }`);
      return editedFile.apply().then(() => {
        let editedFile = new InsertChange(routesFile, 0,
`import { AboutComponent } from './app/about/about.component';
import { DetailsComponent } from './app/about/details/details.component';
import { DetailsComponent as DetailsComponent_1 } from './app/about/description/details.component;\n`);
        return editedFile.apply();
      }).then(() => {
        options.dasherizedName = 'details';
        options.component = 'DetailsComponent';
        expect(() => nru.addPathToRoutes(routesFile, _.merge({route: 'about/details'}, options)))
        .to.throw(Error);
      });
    });

    it('adds guard to parent route: addItemsToRouteProperties', () => {
      let path = `\n  { path: 'home', component: HomeComponent }\n`;
      let editedFile = new InsertChange(routesFile, 16, path);
      return editedFile.apply().then(() => {
        let toInsert = {'home': ['canActivate', '[ MyGuard ]'] };
        return nru.applyChanges(nru.addItemsToRouteProperties(routesFile, toInsert)); })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(
`export default [
  { path: 'home', component: HomeComponent, canActivate: [ MyGuard ] }
];`
        );
      });
    });
    it('adds guard to child route: addItemsToRouteProperties', () => {
      let path = `\n  { path: 'home', component: HomeComponent }\n`;
      let editedFile = new InsertChange(routesFile, 16, path);
      return editedFile.apply().then(() => {
        options.dasherizedName = 'more';
        options.component = 'MoreComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/more'}, options))); })
      .then(() => {
        return nru.applyChanges(nru.addItemsToRouteProperties(routesFile,
          { 'home/more': ['canDeactivate', '[ MyGuard ]'] })); })
      .then(() => {
        return nru.applyChanges(nru.addItemsToRouteProperties(
          routesFile, { 'home/more': ['useAsDefault', 'true'] })); })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        expect(content).to.equal(
`import { MoreComponent } from './app/home/more/more.component';
export default [
  { path: 'home', component: HomeComponent,
    children: [
      { path: 'more', component: MoreComponent, canDeactivate: [ MyGuard ], useAsDefault: true } 
    ]
  }
];`
        );
      });
    });
  });

  describe('validators', () => {
    const projectRoot = process.cwd();
    const componentFile = path.join(projectRoot, 'src/app/about/about.component.ts');
    beforeEach(() => {
      let mockDrive = {
        'src': {
          'app': {
            'about': {
              'about.component.ts' : 'export class AboutComponent { }'
            }
          }
        }
      };
      mockFs(mockDrive);
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('accepts component name without \'component\' suffix: resolveComponentPath', () => {
      let fileName = nru.resolveComponentPath(projectRoot, 'src/app', 'about');
      expect(fileName).to.equal(componentFile);
    });
    it('accepts component name with \'component\' suffix: resolveComponentPath', () => {
      let fileName = nru.resolveComponentPath(projectRoot, 'src/app', 'about.component');
      expect(fileName).to.equal(componentFile);
    });
    it('accepts path absolute from project root: resolveComponentPath', () => {
      let fileName = nru.resolveComponentPath(projectRoot, '', `${path.sep}about`);
      expect(fileName).to.equal(componentFile);
    });
    it('accept component with directory name: resolveComponentPath', () => {
      let fileName = nru.resolveComponentPath(projectRoot, 'src/app', 'about/about.component');
      expect(fileName).to.equal(componentFile);
    });

    it('finds component name: confirmComponentExport', () => {
      let exportExists = nru.confirmComponentExport(componentFile, 'AboutComponent');
      expect(exportExists).to.be.truthy;
    });
    it('finds component in the presence of decorators: confirmComponentExport', () => {
      let editedFile = new InsertChange(componentFile, 0, '@Component{}\n');
      return editedFile.apply().then(() => {
        let exportExists = nru.confirmComponentExport(componentFile, 'AboutComponent');
        expect(exportExists).to.be.truthy;
      });
    });
    it('report absence of component name: confirmComponentExport', () => {
      let editedFile = new RemoveChange(componentFile, 21, 'onent');
      return editedFile.apply().then(() => {
        let exportExists = nru.confirmComponentExport(componentFile, 'AboutComponent');
        expect(exportExists).to.not.be.truthy;
      });
    });
  });
});
