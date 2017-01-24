import {
  killAllProcesses,
  exec,
  waitForAnyProcessOutputToMatch,
  silentExecAndWaitForOutputToMatch,
  ng, execAndWaitForOutputToMatch,
} from '../../utils/process';
import {writeFile} from '../../utils/fs';
import {wait} from '../../utils/utils';


export default function() {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  let oldNumberOfChunks = 0;
  const chunkRegExp = /chunk\s+\{/g;

  return execAndWaitForOutputToMatch('ng', ['serve'], /webpack: bundle is now VALID/)
    // Should trigger a rebuild.
    .then(() => exec('touch', 'src/main.ts'))
    .then(() => waitForAnyProcessOutputToMatch(/webpack: bundle is now INVALID/, 1000))
    .then(() => waitForAnyProcessOutputToMatch(/webpack: bundle is now VALID/, 5000))
    // Count the bundles.
    .then((stdout: string) => {
      oldNumberOfChunks = stdout.split(chunkRegExp).length;
    })
    // Add a lazy module.
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    // Just wait for the rebuild, otherwise we might be validating this build.
    .then(() => wait(1000))
    .then(() => writeFile('src/app/app.module.ts', `
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { FormsModule } from '@angular/forms';
      import { HttpModule } from '@angular/http';
      
      import { AppComponent } from './app.component';
      import { RouterModule } from '@angular/router';
      
      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          BrowserModule,
          FormsModule,
          HttpModule,
          RouterModule.forRoot([
            { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule' }
          ])
        ],
        providers: [],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `))
    // Should trigger a rebuild with a new bundle.
    .then(() => waitForAnyProcessOutputToMatch(/webpack: bundle is now INVALID/, 1000))
    .then(() => waitForAnyProcessOutputToMatch(/webpack: bundle is now VALID/, 5000))
    // Count the bundles.
    .then((stdout: string) => {
      let newNumberOfChunks = stdout.split(chunkRegExp).length;
      if (oldNumberOfChunks >= newNumberOfChunks) {
        throw new Error('Expected webpack to create a new chunk, but did not.');
      }
    })
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
