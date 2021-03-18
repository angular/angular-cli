import { getGlobalVariable } from '../../../utils/env';
import { writeFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  if ((getGlobalVariable('argv')['ve'])) {
    // Does not apply to ViewEngine
    return;
  }

  await ng('generate', 'library', 'my-lib');

  // Enable partial compilation mode (linker) for the library
  await updateJsonFile('projects/my-lib/tsconfig.lib.json', config => {
    const { angularCompilerOptions = {} } = config;
    angularCompilerOptions.enableIvy = true;
    angularCompilerOptions.compilationMode = 'partial';
    config.angularCompilerOptions = angularCompilerOptions;
  });

  await writeFile('./src/app/app.module.ts', `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { MyLibModule } from 'my-lib';

      import { AppComponent } from './app.component';

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule,
          MyLibModule,
        ],
        providers: [],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `);

  await writeFile('./src/app/app.component.ts', `
      import { Component } from '@angular/core';
      import { MyLibService } from 'my-lib';

      @Component({
        selector: 'app-root',
        template: '<lib-my-lib></lib-my-lib>'
      })
      export class AppComponent {
        title = 'test-project';

        constructor(myLibService: MyLibService) {
          console.log(myLibService);
        }
      }
    `);

  await writeFile('e2e/src/app.e2e-spec.ts', `
    import { browser, logging, element, by } from 'protractor';
    import { AppPage } from './app.po';

    describe('workspace-project App', () => {
      let page: AppPage;

      beforeEach(() => {
        page = new AppPage();
      });

      it('should display text from library component', async () => {
        await page.navigateTo();
        expect(await element(by.css('lib-my-lib p')).getText()).toEqual('my-lib works!');
      });

      afterEach(async () => {
        // Assert that there are no errors emitted from the browser
        const logs = await browser.manage().logs().get(logging.Type.BROWSER);
        expect(logs).not.toContain(jasmine.objectContaining({
          level: logging.Level.SEVERE,
        }));
      });
    });
  `);

  // Build library in partial mode (development)
  await ng('build', 'my-lib', '--configuration=development');

  // AOT linking
  await runTests();

  // JIT linking
  await updateJsonFile('angular.json', config => {
    const build = config.projects['test-project'].architect.build;
    build.options.aot = false;
    build.configurations.production.buildOptimizer = false;
  });

  await runTests();
}

async function runTests(): Promise<void> {
  // Check that the tests succeeds both with named project, unnamed (should test app), and prod.
  await ng('e2e');
  await ng('e2e', 'test-project', '--devServerTarget=test-project:serve:production');
}
