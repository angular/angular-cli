import {Component, OnInit} from 'angular2/core';<% if (route) { %>
import {RouteConfig, ROUTER_DIRECTIVES, ROUTER_PROVIDERS} from 'angular2/router';<% } %>

@Component({
  moduleId: __moduleName,
  selector: '<%= dasherizedModuleName %>',<% if(inlineTemplate) { %>
  template: `
    <p>
      <%= dasherizedModuleName %> Works!
    </p><% if (route) { %>
    <router-outlet></router-outlet><% } %>
  `,<% } else { %>
  templateUrl: '<%= dasherizedModuleName %>.component.html',<% } if(inlineStyle) { %>
  styles: []<% } else { %>
  styleUrls: ['<%= dasherizedModuleName %>.component.<%= styleExt %>']<% } if (route) { %>,
  directives: [ROUTER_DIRECTIVES]<% } %>
})
export class <%= classifiedModuleName %>Component implements OnInit {

  constructor() {}
  
  ngOnInit() {
  }

}
