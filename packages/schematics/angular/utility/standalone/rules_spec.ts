/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, SchematicContext, Tree, callRule } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { join } from 'path';
import { addRootImport, addRootProvider } from './rules';

describe('standalone utilities', () => {
  const projectName = 'test';
  let host: Tree;

  async function setupProject(standalone = false) {
    const schematicRunner = new SchematicTestRunner(
      '@schematics/angular',
      require.resolve('../../collection.json'),
    );

    host = await schematicRunner.runSchematic('workspace', {
      name: 'workspace',
      newProjectRoot: '/',
      version: '6.0.0',
    });
    host = await schematicRunner.runSchematic(
      'application',
      {
        name: projectName,
        standalone,
      },
      host,
    );
  }

  afterEach(() => {
    // Clear the host so it doesn't leak between tests.
    host = null as unknown as Tree;
  });

  function stripWhitespace(str: string) {
    return str.replace(/\s/g, '');
  }

  function assertContains(source: string, targetString: string) {
    expect(stripWhitespace(source)).toContain(stripWhitespace(targetString));
  }

  function getPathWithinProject(path: string): string {
    return join('/', projectName, 'src', path);
  }

  function readFile(projectPath: string): string {
    return host.readText(getPathWithinProject(projectPath));
  }

  async function testRule(rule: Rule, tree: Tree): Promise<void> {
    await callRule(rule, tree, {} as unknown as SchematicContext).toPromise();
  }

  describe('addRootImport', () => {
    it('should add a root import to an NgModule-based app', async () => {
      await setupProject();

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}.forRoot([])`,
        ),
        host,
      );

      const content = readFile('app/app.module.ts');

      assertContains(content, `import { MyModule } from '@my/module';`);
      assertContains(content, `imports: [BrowserModule, MyModule.forRoot([])]`);
    });

    it('should add a root import to a standalone app', async () => {
      await setupProject(true);

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      const content = readFile('app/app.config.ts');

      assertContains(
        content,
        `import { ApplicationConfig, importProvidersFrom } from '@angular/core';`,
      );
      assertContains(content, `import { MyModule } from '@my/module';`);
      assertContains(content, `providers: [importProvidersFrom(MyModule)]`);
    });

    it('should add a root import to a standalone app whose app config does not have a providers array', async () => {
      await setupProject(true);

      host.overwrite(
        getPathWithinProject('app/app.config.ts'),
        `
          import { ApplicationConfig } from '@angular/core';

          export const appConfig: ApplicationConfig = {};
        `,
      );

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      const content = readFile('app/app.config.ts');

      assertContains(
        content,
        `import { ApplicationConfig, importProvidersFrom } from '@angular/core';`,
      );
      assertContains(content, `import { MyModule } from '@my/module';`);
      assertContains(content, `providers: [importProvidersFrom(MyModule)]`);
    });

    it('should add a root import to a standalone app with a config with providers', async () => {
      await setupProject(true);

      host.overwrite(
        getPathWithinProject('app/app.config.ts'),
        `
          import { ApplicationConfig } from '@angular/core';

          export const appConfig: ApplicationConfig = {
            providers: [
              {provide: 'foo', useValue: 123}
            ]
          };
        `,
      );

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      const content = readFile('app/app.config.ts');

      assertContains(
        content,
        `import { ApplicationConfig, importProvidersFrom } from '@angular/core';`,
      );
      assertContains(content, `import { MyModule } from '@my/module';`);
      assertContains(
        content,
        `providers: [
        {provide: 'foo', useValue: 123},
        importProvidersFrom(MyModule)
      ]`,
      );
    });

    it(
      'should add a root import to a standalone app whose app config does not have have ' +
        'a providers array, but has another property',
      async () => {
        await setupProject(true);

        host.overwrite(
          getPathWithinProject('app/app.config.ts'),
          `
          import { ApplicationConfig } from '@angular/core';

          export const appConfig: ApplicationConfig = {
            otherProp: {},
          };
        `,
        );

        await testRule(
          addRootImport(
            projectName,
            ({ code, external }) => code`${external('MyModule', '@my/module')}`,
          ),
          host,
        );

        const content = readFile('app/app.config.ts');

        assertContains(
          content,
          `import { ApplicationConfig, importProvidersFrom } from '@angular/core';`,
        );
        assertContains(content, `import { MyModule } from '@my/module';`);
        assertContains(
          content,
          `
            export const appConfig: ApplicationConfig = {
              otherProp: {},
              providers: [importProvidersFrom(MyModule)]
            };
          `,
        );
      },
    );

    it('should add a root import to a standalone app with an inline app config', async () => {
      await setupProject(true);

      host.overwrite(
        getPathWithinProject('main.ts'),
        `
        import { bootstrapApplication } from '@angular/platform-browser';
        import { AppComponent } from './app/app.component';

        bootstrapApplication(AppComponent, {});
      `,
      );

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      const content = readFile('main.ts');

      assertContains(content, `import { importProvidersFrom } from '@angular/core';`);
      assertContains(content, `import { MyModule } from '@my/module';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {
          providers: [importProvidersFrom(MyModule)]
        });`,
      );
    });

    it('should add a root import to a standalone app without an app config', async () => {
      await setupProject(true);

      host.overwrite(
        getPathWithinProject('main.ts'),
        `
        import { bootstrapApplication } from '@angular/platform-browser';
        import { AppComponent } from './app/app.component';

        bootstrapApplication(AppComponent);
      `,
      );

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      const content = readFile('main.ts');

      assertContains(content, `import { importProvidersFrom } from '@angular/core';`);
      assertContains(content, `import { MyModule } from '@my/module';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, {
          providers: [importProvidersFrom(MyModule)]
        });`,
      );
    });

    it('should add a root import to a standalone app with a merged app config', async () => {
      await setupProject(true);

      host.overwrite(
        getPathWithinProject('main.ts'),
        `
          import { mergeApplicationConfig } from '@angular/core';
          import { bootstrapApplication } from '@angular/platform-browser';
          import { AppComponent } from './app.component';

          bootstrapApplication(AppComponent, mergeApplicationConfig(a, b));
        `,
      );

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      const content = readFile('main.ts');

      assertContains(
        content,
        `import { mergeApplicationConfig, importProvidersFrom } from '@angular/core';`,
      );
      assertContains(content, `import { MyModule } from '@my/module';`);
      assertContains(
        content,
        `bootstrapApplication(AppComponent, mergeApplicationConfig(a, b, {
          providers: [importProvidersFrom(MyModule)]
        }));`,
      );
    });

    it('should alias symbols that conflict with existing code', async () => {
      await setupProject();

      await testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('BrowserModule', '@my/module')}.forRoot([])`,
        ),
        host,
      );

      const content = readFile('app/app.module.ts');

      assertContains(content, `import { BrowserModule as BrowserModule_alias } from '@my/module';`);
      assertContains(content, `imports: [BrowserModule, BrowserModule_alias.forRoot([])]`);
    });

    it('should throw an error if the bootstrapApplication code has no arguments', async () => {
      await setupProject(true);

      const mainPath = getPathWithinProject('main.ts');

      host.overwrite(
        mainPath,
        `
        import { bootstrapApplication } from '@angular/platform-browser';

        bootstrapApplication();
      `,
      );

      const promise = testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      await expectAsync(promise).toBeRejectedWithError(
        `Cannot add provider to invalid bootstrapApplication call in ${mainPath}`,
      );
    });

    it('should throw an error if the bootstrapApplication call cannot be analyzed', async () => {
      await setupProject(true);

      const mainPath = getPathWithinProject('main.ts');

      host.overwrite(
        mainPath,
        `
        import { bootstrapApplication } from '@angular/platform-browser';
        import { AppComponent } from './app/app.component';
        import { appConfig } from '@external/app-config';

        bootstrapApplication(AppComponent, appConfig);
      `,
      );

      const promise = testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      await expectAsync(promise).toBeRejectedWithError(
        `Cannot statically analyze bootstrapApplication call in ${mainPath}`,
      );
    });

    it('should throw an error if there is no bootstrapApplication call', async () => {
      await setupProject(true);
      host.overwrite(getPathWithinProject('main.ts'), '');

      const promise = testRule(
        addRootImport(
          projectName,
          ({ code, external }) => code`${external('MyModule', '@my/module')}`,
        ),
        host,
      );

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      await expectAsync(promise).toBeRejectedWithError('Bootstrap call not found');
    });
  });

  describe('addRootProvider', () => {
    it('should add a root provider to an NgModule-based app', async () => {
      await setupProject();

      await testRule(
        addRootProvider(
          projectName,
          ({ code, external }) =>
            code`{ provide: ${external('SOME_TOKEN', '@my/module')}, useValue: 123 }`,
        ),
        host,
      );

      const content = readFile('app/app.module.ts');

      assertContains(content, `import { SOME_TOKEN } from '@my/module';`);
      assertContains(content, `providers: [{ provide: SOME_TOKEN, useValue: 123 }]`);
    });

    it('should add a root provider to a standalone app', async () => {
      await setupProject(true);

      await testRule(
        addRootProvider(
          projectName,
          ({ code, external }) => code`${external('provideModule', '@my/module')}([])`,
        ),
        host,
      );

      const content = readFile('app/app.config.ts');

      assertContains(content, `import { provideModule } from '@my/module';`);
      assertContains(content, `providers: [provideModule([])]`);
    });
  });
});
