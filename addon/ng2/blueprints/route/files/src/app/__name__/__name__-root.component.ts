import {Component} from 'angular2/core';
import {RouteConfig, RouterOutlet} from 'angular2/router';

import {<%= classifiedModuleName %>ListComponent} from './<%= dasherizedModuleName %>-list.component';
import {<%= classifiedModuleName %>DetailComponent} from './<%= dasherizedModuleName %>-detail.component';
import {<%= classifiedModuleName %>Service} from './<%= dasherizedModuleName %>.service';

@Component({
  template: '<router-outlet></router-outlet>',
  providers: [<%= classifiedModuleName %>Service],
  directives: [RouterOutlet]
})
@RouteConfig([
  {path:'/', name: '<%= classifiedModuleName %>List', component: <%= classifiedModuleName %>ListComponent, useAsDefault: true},
  {path:'/:id', name: '<%= classifiedModuleName %>Detail', component: <%= classifiedModuleName %>DetailComponent}
])
export class <%= classifiedModuleName %>Root {
  constructor() {}
}
