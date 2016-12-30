import * as mockFs from 'mock-fs';
import * as fs from 'fs';
import * as nru from './route-utils';
import * as path from 'path';
import { NodeHost, InsertChange, RemoveChange } from './change';
import denodeify = require('denodeify');
import * as _ from 'lodash';
import {it} from './spec-utils';

const readFile = (denodeify(fs.readFile) as (...args: any[]) => Promise<any>);


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
      return editedFile.apply(NodeHost)
        .then(() => nru.insertImport(sourceFile, 'Router', '@angular/router').apply(NodeHost))
        .then(() => readFile(sourceFile, 'utf8'))
        .then(newContent => {
          expect(newContent).toEqual(content + `\nimport { Router } from '@angular/router';`);
        });
    });
    it('does not insert if present', () => {
      let content = `'use strict'\n import {Router} from '@angular/router'`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply(NodeHost)
        .then(() => nru.insertImport(sourceFile, 'Router', '@angular/router'))
        .then(() => readFile(sourceFile, 'utf8'))
        .then(newContent => {
          expect(newContent).toEqual(content);
        });
    });
    it('inserts into existing import clause if import file is already cited', () => {
      let content = `'use strict'\n import { foo, bar } from 'fizz'`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply(NodeHost)
        .then(() => nru.insertImport(sourceFile, 'baz', 'fizz').apply(NodeHost))
        .then(() => readFile(sourceFile, 'utf8'))
        .then(newContent => {
          expect(newContent).toEqual(`'use strict'\n import { foo, bar, baz } from 'fizz'`);
        });
    });
    it('understands * imports', () => {
      let content = `\nimport * as myTest from 'tests' \n`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply(NodeHost)
        .then(() => nru.insertImport(sourceFile, 'Test', 'tests'))
        .then(() => readFile(sourceFile, 'utf8'))
        .then(newContent => {
          expect(newContent).toEqual(content);
        });
    });
    it('inserts after use-strict', () => {
      let content = `'use strict';\n hello`;
      let editedFile = new InsertChange(sourceFile, 0, content);
      return editedFile.apply(NodeHost)
        .then(() => nru.insertImport(sourceFile, 'Router', '@angular/router').apply(NodeHost))
        .then(() => readFile(sourceFile, 'utf8'))
        .then(newContent => {
          expect(newContent).toEqual(
            `'use strict';\nimport { Router } from '@angular/router';\n hello`);
        });
    });
    it('inserts inserts at beginning of file if no imports exist', () => {
      return nru.insertImport(sourceFile, 'Router', '@angular/router').apply(NodeHost)
        .then(() => readFile(sourceFile, 'utf8'))
        .then(newContent => {
          expect(newContent).toEqual(`import { Router } from '@angular/router';\n`);
        });
    });
    it('inserts subcomponent in win32 environment', () => {
      let content = './level1\\level2/level2.component';
      return nru.insertImport(sourceFile, 'level2', content).apply(NodeHost)
        .then(() => readFile(sourceFile, 'utf8'))
        .then(newContent => {
          if (process.platform.startsWith('win')) {
            expect(newContent).toEqual(
            `import { level2 } from './level1/level2/level2.component';\n`);
          } else {
            expect(newContent).toEqual(
            `import { level2 } from './level1\\level2/level2.component';\n`);
          }
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
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [ provideRouter(routes) ]);');
        });
    });
    xit('does not add a provideRouter import if it exits already', () => {
      return nru.insertImport(mainFile, 'provideRouter', '@angular/router').apply(NodeHost)
        .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(
            `import routes from './routes';
  import { provideRouter } from '@angular/router';
  bootstrap(AppComponent, [ provideRouter(routes) ]);`);
        });
    });
    xit('does not duplicate import to route.ts ', () => {
      let editedFile = new InsertChange(mainFile, 100, `\nimport routes from './routes';`);
      return editedFile
        .apply(NodeHost)
        .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [ provideRouter(routes) ]);');
        });
    });
    it('adds provideRouter to bootstrap if absent and no providers array', () => {
      return nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [ provideRouter(routes) ]);');
        });
    });
    it('adds provideRouter to bootstrap if absent and empty providers array', () => {
      let editFile = new InsertChange(mainFile, 124, ', []');
      return editFile.apply(NodeHost)
        .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [provideRouter(routes)]);');
        });
    });
    it('adds provideRouter to bootstrap if absent and non-empty providers array', () => {
      let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS ]');
      return editedFile.apply(NodeHost)
        .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [ HTTP_PROVIDERS, provideRouter(routes) ]);');
        });
    });
    it('does not add provideRouter to bootstrap if present', () => {
      let editedFile = new InsertChange(mainFile,
                                        124,
                                        ', [ HTTP_PROVIDERS, provideRouter(routes) ]');
      return editedFile.apply(NodeHost)
        .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [ HTTP_PROVIDERS, provideRouter(routes) ]);');
        });
    });
    it('inserts into the correct array', () => {
      let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS, {provide: [BAR]}]');
      return editedFile.apply(NodeHost)
        .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [ HTTP_PROVIDERS, {provide: [BAR]}, provideRouter(routes)]);');
        });
    });
    it('throws an error if there is no or multiple bootstrap expressions', () => {
      let editedFile = new InsertChange(mainFile, 126, '\n bootstrap(moreStuff);');
      return editedFile.apply(NodeHost)
        .then(() => nru.bootstrapItem(mainFile, routes, toBootstrap))
        .catch(e =>
          expect(e.message).toEqual('Did not bootstrap provideRouter in' +
            ' tmp/main.ts because of multiple or no bootstrap calls')
        );
    });
    it('configures correctly if bootstrap or provide router is not at top level', () => {
      let editedFile = new InsertChange(mainFile, 126, '\n if(e){bootstrap, provideRouter});');
      return editedFile.apply(NodeHost)
        .then(() => nru.applyChanges(nru.bootstrapItem(mainFile, routes, toBootstrap)))
        .then(() => readFile(mainFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(prefix + routerImport +
            'bootstrap(AppComponent, [ provideRouter(routes) ]);\n if(e){bootstrap, provideRouter});'); // tslint:disable-line
        });
    });
  });

  describe('addPathToRoutes', () => {
    const routesFile = 'src/routes.ts';
    let options = {dir: 'src/app', appRoot: 'src/app', routesFile: routesFile,
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
      return nru.applyChanges(nru.addPathToRoutes(routesFile,
                                                  _.merge({route: 'new-route'}, options)))
        .then(() => readFile(routesFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(
            `import { NewRouteComponent } from './app/new-route/new-route.component';
export default [\n  { path: 'new-route', component: NewRouteComponent }\n];`);
        });
    });
    it('throws error if multiple export defaults exist', () => {
      let editedFile = new InsertChange(routesFile, 20, 'export default {}');
      return editedFile.apply(NodeHost).then(() => {
        return nru.addPathToRoutes(routesFile, _.merge({route: 'new-route'}, options));
      }).catch(e => {
        expect(e.message).toEqual('Did not insert path in routes.ts because '
          + `there were multiple or no 'export default' statements`);
      });
    });
    it('throws error if no export defaults exists', () => {
      let editedFile = new RemoveChange(routesFile, 0, 'export default []');
      return editedFile.apply(NodeHost).then(() => {
        return nru.addPathToRoutes(routesFile, _.merge({route: 'new-route'}, options));
      }).catch(e => {
        expect(e.message).toEqual('Did not insert path in routes.ts because '
          + `there were multiple or no 'export default' statements`);
      });
    });
    it('treats positional params correctly', () => {
      let editedFile = new InsertChange(routesFile, 16,
        `\n  { path: 'home', component: HomeComponent }\n`);
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'about';
        options.component = 'AboutComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/:id'}, options))); })
        .then(() => readFile(routesFile, 'utf8'))
        .then(content => {
          expect(content).toEqual(
            `import { AboutComponent } from './app/home/about/about.component';` +
            `\nexport default [\n` +
            `  { path: 'home', component: HomeComponent,\n` +
            `    children: [\n` +
            `      { path: 'about/:id', component: AboutComponent }` +
            `\n    ]\n  }\n];`);
        });
    });
    it('inserts under parent, mid', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'details';
        options.component = 'DetailsComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/details'}, options))); })
        .then(() => readFile(routesFile, 'utf8'))
        .then(content => {
          // tslint:disable-next-line
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
          expect(content).toEqual(expected);
        });
    });
    it('inserts under parent, deep', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'sections';
        options.component = 'SectionsComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile,
                              _.merge({route: 'home/about/more/sections'}, options))); })
        .then(() => readFile(routesFile, 'utf8'))
        .then(content => {
          // tslint:disable-next-line
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
          expect(content).toEqual(expected);
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
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'about';
        options.component = 'AboutComponent_1';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/:id'}, options))); })
        .then(() => readFile(routesFile, 'utf8'))
        .then(content => {
          // tslint:disable-next-line
          expect(content).toEqual(`import { AboutComponent_1 } from './app/home/about/about.component';
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
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'home';
        options.component = 'HomeComponent';
        return nru.addPathToRoutes(routesFile, _.merge({route: '/home'}, options));
      }).catch(e => {
        expect(e.message).toEqual('Route was not added since it is a duplicate');
      });
    });
    it('throws error if repeating child, mid', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'about';
        options.component = 'AboutComponent';
        return nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/'}, options));
      }).catch(e => {
        expect(e.message).toEqual('Route was not added since it is a duplicate');
      });
    });
    it('throws error if repeating child, deep', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'more';
        options.component = 'MoreComponent';
        return nru.addPathToRoutes(routesFile, _.merge({route: 'home/about/more'}, options));
      }).catch(e => {
        expect(e.message).toEqual('Route was not added since it is a duplicate');
      });
    });
    it('does not report false repeat', () => {
      let editedFile = new InsertChange(routesFile, 16, nestedRoutes);
      return editedFile.apply(NodeHost).then(() => {
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
          expect(content).toEqual(expected);
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
      return editedFile.apply(NodeHost).then(() => {
        options.dasherizedName = 'trap-queen';
        options.component = 'TrapQueenComponent';
        return nru.applyChanges(
          nru.addPathToRoutes(routesFile, _.merge({route: 'home/trap-queen'}, options)));
      })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        // tslint:disable-next-line
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
        expect(content).toEqual(expected);
      });
    });
    it('resolves imports correctly', () => {
      let editedFile = new InsertChange(routesFile, 16,
        `\n  { path: 'home', component: HomeComponent }\n`);
      return editedFile.apply(NodeHost).then(() => {
        let editedFile = new InsertChange(routesFile, 0,
          `import { HomeComponent } from './app/home/home.component';\n`);
        return editedFile.apply(NodeHost);
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
          expect(content).toEqual(expected);
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
      return editedFile.apply(NodeHost).then(() => {
        let editedFile = new InsertChange(routesFile, 0,
          `import { AboutComponent } from './app/about/about.component';
import { DetailsComponent } from './app/about/details/details.component';
import { DetailsComponent as DetailsComponent_1 } from './app/about/description/details.component;\n`); // tslint:disable-line
        return editedFile.apply(NodeHost);
      }).then(() => {
        options.dasherizedName = 'details';
        options.component = 'DetailsComponent';
        expect(() => nru.addPathToRoutes(routesFile, _.merge({route: 'about/details'}, options)))
          .toThrowError();
      });
    });

    it('adds guard to parent route: addItemsToRouteProperties', () => {
      let path = `\n  { path: 'home', component: HomeComponent }\n`;
      let editedFile = new InsertChange(routesFile, 16, path);
      return editedFile.apply(NodeHost).then(() => {
        let toInsert = {'home': ['canActivate', '[ MyGuard ]'] };
        return nru.applyChanges(nru.addItemsToRouteProperties(routesFile, toInsert));
      })
      .then(() => readFile(routesFile, 'utf8'))
      .then(content => {
        expect(content).toEqual(`export default [
  { path: 'home', component: HomeComponent, canActivate: [ MyGuard ] }
];`
        );
      });
    });
    it('adds guard to child route: addItemsToRouteProperties', () => {
      let path = `\n  { path: 'home', component: HomeComponent }\n`;
      let editedFile = new InsertChange(routesFile, 16, path);
      return editedFile.apply(NodeHost).then(() => {
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
          expect(content).toEqual(
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
      expect(fileName).toEqual(componentFile);
    });
    it('accepts component name with \'component\' suffix: resolveComponentPath', () => {
      let fileName = nru.resolveComponentPath(projectRoot, 'src/app', 'about.component');
      expect(fileName).toEqual(componentFile);
    });
    it('accepts path absolute from project root: resolveComponentPath', () => {
      let fileName = nru.resolveComponentPath(projectRoot, '', `${path.sep}about`);
      expect(fileName).toEqual(componentFile);
    });
    it('accept component with directory name: resolveComponentPath', () => {
      let fileName = nru.resolveComponentPath(projectRoot, 'src/app', 'about/about.component');
      expect(fileName).toEqual(componentFile);
    });

    it('finds component name: confirmComponentExport', () => {
      let exportExists = nru.confirmComponentExport(componentFile, 'AboutComponent');
      expect(exportExists).toBeTruthy();
    });
    it('finds component in the presence of decorators: confirmComponentExport', () => {
      let editedFile = new InsertChange(componentFile, 0, '@Component{}\n');
      return editedFile.apply(NodeHost).then(() => {
        let exportExists = nru.confirmComponentExport(componentFile, 'AboutComponent');
        expect(exportExists).toBeTruthy();
      });
    });
    it('report absence of component name: confirmComponentExport', () => {
      let editedFile = new RemoveChange(componentFile, 21, 'onent');
      return editedFile.apply(NodeHost).then(() => {
        let exportExists = nru.confirmComponentExport(componentFile, 'AboutComponent');
        expect(exportExists).not.toBeTruthy();
      });
    });
  });
});
