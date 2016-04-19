import {Component, OnInit} from 'angular2/core';<% if (route) { %>
import {RouteConfig, ROUTER_DIRECTIVES, ROUTER_PROVIDERS} from 'angular2/router';<% } %>

@Component({
  moduleId: __moduleName,
  selector: '<%= dasherizedModuleName %>',
  templateUrl: '<%= dasherizedModuleName %>.component.html',
  styleUrls: ['<%= dasherizedModuleName %>.component.<%= styleExt %>']<% if (route) { %>,
  directives: [ROUTER_DIRECTIVES]<% } %>
})<% if (route) { %>
@RouteConfig([
])<% } %>
export class <%= classifiedModuleName %>Component implements OnInit {

  constructor() {}
  
  ngOnInit() {
  }

}
