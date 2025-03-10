import { writeMultipleFiles } from '../../../utils/fs';
import { silentNg } from '../../../utils/process';

export async function libraryConsumptionSetup(): Promise<void> {
  await silentNg('generate', 'library', 'my-lib');

  // Force an external template
  await writeMultipleFiles({
    'projects/my-lib/src/lib/my-lib.ng.html': `<p>my-lib works!</p>`,
    'projects/my-lib/src/lib/my-lib.ts': `import { Component } from '@angular/core';

    @Component({
      standalone: true,
      selector: 'lib-my-lib',
      templateUrl: './my-lib.ng.html',
    })
    export class MyLibComponent {}`,
    './src/app/app.ts': `
    import { Component } from '@angular/core';
    import { MyLibService, MyLibComponent } from 'my-lib';

    @Component({
      standalone: true,
      selector: 'app-root',
      template: '<lib-my-lib></lib-my-lib>',
      imports: [MyLibComponent],
    })
    export class App {
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
