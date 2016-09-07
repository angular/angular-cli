import {readdirSync} from 'fs';
import {oneLine} from 'common-tags';

import {ng} from '../utils/process';
import {addImportToModule} from '../utils/ast';


export default function() {
  let currentNumberOfDist = 0;
  return ng('build')
    .then(() => currentNumberOfDist = readdirSync('dist'))
    .then(() => ng('generate', 'module', 'lazy'))
    .then(() => addImportToModule('src/app/app.module.ts', oneLine`
      RouteModule.forRoot({ loadChildren: "lazy/lazy.module#LazyModule" })
      `, '@angular/core'));
}
