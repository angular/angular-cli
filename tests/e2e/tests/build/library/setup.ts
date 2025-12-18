import type { Page } from 'puppeteer';
import { writeMultipleFiles } from '../../../utils/fs';
import { silentNg } from '../../../utils/process';

export async function libraryConsumptionSetup(): Promise<void> {
  await silentNg('generate', 'library', 'my-lib');

  // Force an external template
  await writeMultipleFiles({
    'projects/my-lib/src/lib/my-lib.html': `<p>my-lib works!</p>`,
    'projects/my-lib/src/lib/my-lib.ts': `import { Component } from '@angular/core';

    @Component({
      selector: 'lib-my-lib',
      templateUrl: './my-lib.html',
    })
    export class MyLibComponent {}`,
    './src/app/app.ts': `
    import { Component } from '@angular/core';
    import { MyLibComponent } from 'my-lib';

    @Component({
      selector: 'app-root',
      template: '<lib-my-lib></lib-my-lib>',
      imports: [MyLibComponent],
    })
    export class App {
      title = 'test-project';

      constructor() {
      }
    }
  `,
  });
}

export async function browserCheck(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      !!(globalThis as any).document
        .querySelector('lib-my-lib p')
        ?.textContent?.includes('my-lib works!'),
    { timeout: 10000 },
  );
}
