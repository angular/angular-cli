import { RouterConfig } from '@angular/router';
import { <%= classifiedModuleName %>Component } from './';

export const <%= screamingSnakeCaseModuleName %>_ROUTES: RouterConfig = [{
  path: '<%= dasherizedModuleName %>', component: <%= classifiedModuleName %>Component,
  children: [ ]
}];
