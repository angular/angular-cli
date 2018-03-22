import * as fs from 'fs';
import { writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';


export default async function() {
  // Add a lazy module
  await ng('generate', 'module', 'lazy');
  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.lazyModules = [
      'projects/test-project/src/app/lazy/lazy.module'
    ];
  });

  // Update the app component to use the lazy module
  await writeFile('projects/test-project/src/app/app.component.ts', `
    import { Component, SystemJsNgModuleLoader } from '@angular/core';

    @Component({
      selector: 'app-root',
      templateUrl: './app.component.html',
      styleUrls: ['./app.component.css'],
    })
    export class AppComponent {
      title = 'app';
      constructor(loader: SystemJsNgModuleLoader) {
        // Module will be split at build time and loaded when requested below
        loader.load('app/lazy/lazy.module#LazyModule')
          .then((factory) => { /* Use factory here */ });
      }
    }
  `);

  // Build and look for the split lazy module
  await ng('build');
  for (const file of fs.readdirSync('./dist/test-project')) {
    if (file === 'projects-test-project-src-app-lazy-lazy-module.js') {
      // Lazy module chunk was found and succesfully split
      return;
    }
  }

  throw new Error('Lazy module chunk not created');
}
