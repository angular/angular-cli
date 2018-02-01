import { writeMultipleFiles } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default function () {

  return Promise.resolve()
    // Write assets.
    .then(_ => writeMultipleFiles({
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: []
        })
        export class AppComponent {
          title = 'app';
        }
      `
    }))
    .then(() => ng('build'));
}
