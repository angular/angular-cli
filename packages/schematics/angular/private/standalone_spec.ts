/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
  addFunctionalProvidersToStandaloneBootstrap,
  addModuleImportToStandaloneBootstrap,
  callsProvidersFunction,
  findBootstrapApplicationCall,
  importsProvidersFrom,
} from './standalone';

describe('standalone utilities', () => {
  let host: EmptyTree;

  beforeEach(() => {
    host = new EmptyTree();
  });

  function getSourceFileFrom(path: string) {
    return ts.createSourceFile(path, host.readText(path), ts.ScriptTarget.Latest, true);
  }

  function stripWhitespace(str: string) {
    return str.replace(/\s/g, '');
  }

  function assertContains(source: string, targetString: string) {
    expect(stripWhitespace(source)).toContain(stripWhitespace(targetString));
  }

  describe('findBootstrapApplicationCall', () => {
    it('should find a call to `bootstrapApplication`', () => {
      host.create(
        '/test.ts',
        `
          import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, {
            providers: [importProvidersFrom(BrowserModule)]
          });
        `,
      );

      expect(findBootstrapApplicationCall(getSourceFileFrom('/test.ts'))).toBeTruthy();
    });

    it('should find an aliased call to `bootstrapApplication`', () => {
      host.create(
        '/test.ts',
        `
          import { BrowserModule, bootstrapApplication as boot } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          boot(AppComponent, {
            providers: [importProvidersFrom(BrowserModule)]
          });
        `,
      );

      expect(findBootstrapApplicationCall(getSourceFileFrom('/test.ts'))).toBeTruthy();
    });

    it('should return null if there are no bootstrapApplication calls', () => {
      host.create(
        '/test.ts',
        `
          import { AppComponent } from './app.component';

          console.log(AppComponent);
        `,
      );

      expect(findBootstrapApplicationCall(getSourceFileFrom('/test.ts'))).toBeNull();
    });
  });

  describe('importsProvidersFrom', () => {
    it('should find that a bootstrapApplication call imports providers from a module', () => {
      host.create(
        '/test.ts',
        `
          import { importProvidersFrom } from '@angular/core';
          import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, {
            providers: [
              {provide: foo, useValue: 10},
              importProvidersFrom(BrowserModule)
            ]
          });
        `,
      );

      expect(importsProvidersFrom(host, '/test.ts', 'BrowserModule')).toBe(true);
      expect(importsProvidersFrom(host, '/test.ts', 'FooModule')).toBe(false);
    });

    it('should find that a bootstrapApplication call imports providers from a module if importProvidersFrom is aliased', () => {
      host.create(
        '/test.ts',
        `
          import { importProvidersFrom as imp } from '@angular/core';
          import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, {
            providers: [imp(BrowserModule)]
          });
        `,
      );

      expect(importsProvidersFrom(host, '/test.ts', 'BrowserModule')).toBe(true);
      expect(importsProvidersFrom(host, '/test.ts', 'FooModule')).toBe(false);
    });

    it('should return false if there is no bootstrapApplication calls', () => {
      host.create(
        '/test.ts',
        `
          import { AppComponent } from './app.component';

          console.log(AppComponent);
        `,
      );

      expect(importsProvidersFrom(host, '/test.ts', 'FooModule')).toBe(false);
    });
  });

  describe('callsProvidersFunction', () => {
    it('should find that a bootstrapApplication call invokes a specific providers function', () => {
      host.create(
        '/test.ts',
        `
          import { provideAnimations, bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, {
            providers: [
              {provide: foo, useValue: 10},
              provideAnimations()
            ]
          });
        `,
      );

      expect(callsProvidersFunction(host, '/test.ts', 'provideAnimations')).toBe(true);
      expect(callsProvidersFunction(host, '/test.ts', 'noopAnimations')).toBe(false);
    });

    it('should return false if there is no bootstrapApplication calls', () => {
      host.create(
        '/test.ts',
        `
          import { AppComponent } from './app.component';

          console.log(AppComponent);
        `,
      );

      expect(callsProvidersFunction(host, '/test.ts', 'foo')).toBe(false);
    });
  });

  describe('addModuleImportToStandaloneBootstrap', () => {
    it('should be able to add a module import to a simple `bootstrapApplication` call', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent);
        `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {importProvidersFrom} from '@angular/core';`);
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {providers: [importProvidersFrom(FooModule)]});`,
      );
    });

    it('should be able to add a module import to a `bootstrapApplication` call with an empty options object', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, {});
        `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {importProvidersFrom} from '@angular/core';`);
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {providers: [importProvidersFrom(FooModule)]});`,
      );
    });

    it('should be able to add a module import to a `bootstrapApplication` call with a pre-existing `providers` array', () => {
      host.create(
        '/test.ts',
        `
          import { enableProdMode } from '@angular/core';
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          enableProdMode();

          bootstrapApplication(AppComponent, {
            providers: [{provide: 'foo', useValue: 'bar'}]
          });
        `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {enableProdMode, importProvidersFrom} from '@angular/core';`);
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {
          providers: [
            {provide: 'foo', useValue: 'bar'},
            importProvidersFrom(FooModule)
          ]
        });`,
      );
    });

    it('should be able to add a module import to a `bootstrapApplication` call with a pre-existing `importProvidersFrom` call', () => {
      host.create(
        '/test.ts',
        `
          import { importProvidersFrom } from '@angular/core';
          import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, {
            providers: [{provide: 'foo', useValue: 'bar'}, importProvidersFrom(BrowserModule)]
          });
        `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {importProvidersFrom} from '@angular/core';`);
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {
          providers: [
            {provide: 'foo', useValue: 'bar'},
            importProvidersFrom(BrowserModule, FooModule)
          ]
        });`,
      );
    });

    it('should throw if there is no `bootstrapModule` call', () => {
      host.create(
        '/test.ts',
        `
          import { AppComponent } from './app.component';

          console.log(AppComponent);
        `,
      );

      expect(() => {
        addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');
      }).toThrowError(/Could not find bootstrapApplication call in \/test\.ts/);
    });

    it('should add providers to an imported app config', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';
          import { appConfig } from './app/app.config';

          bootstrapApplication(AppComponent, appConfig);
        `,
      );

      host.create(
        '/app/app.config.ts',
        `
        export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}]
        };
      `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/app/app.config.ts'));

      assertContains(content, `import {importProvidersFrom} from '@angular/core';`);
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}, importProvidersFrom(FooModule)]
        };`,
      );
    });

    it('should add providers to an app config imported through an alias', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';
          import { appConfig as config } from './app/app.config';

          bootstrapApplication(AppComponent, config);
        `,
      );

      host.create(
        '/app/app.config.ts',
        `
        export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}]
        };
      `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/app/app.config.ts'));

      assertContains(content, `import {importProvidersFrom} from '@angular/core';`);
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}, importProvidersFrom(FooModule)]
        };`,
      );
    });

    it('should add providers to an app config coming from a variable in the same file', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          const appConfig = {
            providers: [{provide: 'foo', useValue: 'bar'}]
          };

          bootstrapApplication(AppComponent, appConfig);
        `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {importProvidersFrom} from '@angular/core';`);
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}, importProvidersFrom(FooModule)]
        };`,
      );
    });

    it('should add a module import to a config using mergeApplicationConfig', () => {
      host.create(
        '/test.ts',
        `
          import { mergeApplicationConfig } from '@angular/core';
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, mergeApplicationConfig(a, b));
        `,
      );

      addModuleImportToStandaloneBootstrap(host, '/test.ts', 'FooModule', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(
        content,
        `import {mergeApplicationConfig, importProvidersFrom} from '@angular/core';`,
      );
      assertContains(content, `import {FooModule} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, mergeApplicationConfig(a, b, {
          providers: [importProvidersFrom(FooModule)]
        }));`,
      );
    });
  });

  describe('addFunctionalProvidersToStandaloneBootstrap', () => {
    it('should be able to add a providers function to a simple `bootstrapApplication` call', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent);
        `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(content, `bootstrapApplication(AppComponent, {providers: [provideFoo()]});`);
    });

    it('should be able to add a providers function to a `bootstrapApplication` call with an empty options object', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, {});
        `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(content, `bootstrapApplication(AppComponent, {providers: [provideFoo()]});`);
    });

    it('should be able to add a providers function to a `bootstrapApplication` call with a pre-existing `providers` array', () => {
      host.create(
        '/test.ts',
        `
          import { enableProdMode } from '@angular/core';
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          enableProdMode();

          bootstrapApplication(AppComponent, {
            providers: [{provide: 'foo', useValue: 'bar'}]
          });
        `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {
          providers: [{provide: 'foo', useValue: 'bar'}, provideFoo()]
        });`,
      );
    });

    it('should throw if there is no `bootstrapModule` call', () => {
      host.create(
        '/test.ts',
        `
          import { AppComponent } from './app.component';

          console.log(AppComponent);
        `,
      );

      expect(() => {
        addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');
      }).toThrowError(/Could not find bootstrapApplication call in \/test\.ts/);
    });

    it('should add providers to an imported app config', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';
          import { appConfig } from './app/app.config';

          bootstrapApplication(AppComponent, appConfig);
        `,
      );

      host.create(
        '/app/app.config.ts',
        `
        export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}]
        };
      `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');

      const content = stripWhitespace(host.readText('/app/app.config.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(
        content,
        `export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}, provideFoo()]
        };`,
      );
    });

    it('should add providers to an app config imported through an alias', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';
          import { appConfig as config } from './app/app.config';

          bootstrapApplication(AppComponent, config);
        `,
      );

      host.create(
        '/app/app.config.ts',
        `
        export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}]
        };
      `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');

      const content = stripWhitespace(host.readText('/app/app.config.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(
        content,
        `export const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}, provideFoo()]
        };`,
      );
    });

    it('should add providers to an app config from a variable in the same file', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          const appConfig = {
            providers: [{provide: 'foo', useValue: 'bar'}]
          };

          bootstrapApplication(AppComponent, appConfig);
        `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(
        content,
        `const appConfig = {
          providers: [{provide: 'foo', useValue: 'bar'}, provideFoo()]
        };`,
      );
    });

    it('should be able to add a providers function with specific arguments', () => {
      host.create(
        '/test.ts',
        `
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent);
        `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar', [
        ts.factory.createNumericLiteral(1),
        ts.factory.createStringLiteral('hello', true),
      ]);

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {providers: [provideFoo(1, 'hello')]});`,
      );
    });

    it('should add a providers call to a config using mergeApplicationConfig', () => {
      host.create(
        '/test.ts',
        `
          import { mergeApplicationConfig } from '@angular/core';
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, mergeApplicationConfig(a, b));
        `,
      );

      addFunctionalProvidersToStandaloneBootstrap(host, '/test.ts', 'provideFoo', '@foo/bar');

      const content = stripWhitespace(host.readText('/test.ts'));

      assertContains(content, `import {provideFoo} from '@foo/bar';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, mergeApplicationConfig(a, b, {
          providers: [provideFoo()]
        }));`,
      );
    });
  });
});
