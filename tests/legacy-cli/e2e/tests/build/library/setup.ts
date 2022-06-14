import { writeMultipleFiles } from '../../../utils/fs';
import { silentNg } from '../../../utils/process';

export async function libraryConsumptionSetup(): Promise<void> {
  await silentNg('generate', 'library', 'my-lib');

  // Force an external template
  await writeMultipleFiles({
    'projects/my-lib/src/lib/my-lib.component.html': `<p>my-lib works!</p>`,
    'projects/my-lib/src/lib/my-lib.component.ts': `import { Component } from '@angular/core';

    @Component({
      selector: 'lib-my-lib',
      templateUrl: './my-lib.component.html',
    })
    export class MyLibComponent {}`,
    './src/app/app.module.ts': `
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
  `,
    './src/app/app.component.ts': `
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
  `,
    'e2e/src/app.e2e-spec.ts': `
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
`,
  });
}
