import { ng, silentNpm } from '../../../utils/process';
import { writeFile } from '../../../utils/fs';

export default function () {
  return ng('generate', 'library', 'my-lib')
    .then(() => silentNpm('install'))
    .then(() => ng('build', 'my-lib'))
    .then(() => writeFile('./projects/test-project/src/app/app.module.ts', `
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
    `))
    .then(() => writeFile('./projects/test-project/src/app/app.component.ts', `
      import { Component } from '@angular/core';
      import { MyLibService } from 'my-lib';

      @Component({
        selector: 'app-root',
        template: '<my-lib></my-lib>'
      })
      export class AppComponent {
        title = 'app';

        constructor(myLibService: MyLibService) {
          console.log(myLibService);
        }
      }
    `))
    .then(() => ng('build', 'test-project'))
    .then(() => ng('build', 'test-project', '--prod'));
}
