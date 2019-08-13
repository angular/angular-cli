import { writeFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  await ng('generate', 'library', 'my-lib');
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
        title = 'app';

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

      it('should display text from library component', () => {
        page.navigateTo();
        expect(element(by.css('lib-my-lib p')).getText()).toEqual('my-lib works!');
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

  await runLibraryTests();
  await runLibraryTests(true);
}

async function runLibraryTests(prodMode = false): Promise<void> {
  const args = ['build', 'my-lib'];
  if (prodMode) {
    args.push('--prod');
  }

  await ng(...args);

  // Check that the tests succeeds both with named project, unnammed (should test app), and prod.
  await ng('e2e');
  await ng('e2e', 'test-project', '--devServerTarget=test-project:serve:production');
}
