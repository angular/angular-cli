import { Component } from '@angular/core';<% if (isMobile) { %>
import { APP_SHELL_DIRECTIVES } from '@angular/app-shell';<% } %>

@Component({
  moduleId: module.id,
  selector: '<%= htmlComponentName %>-app',
  <% if (isMobile) { %>template: `
  <h1>
    {{title}}
  </h1>
  `,
  styles: [],
  directives: [APP_SHELL_DIRECTIVES]<% } else { %>templateUrl: '<%= htmlComponentName %>.component.html',
  styleUrls: ['<%= dasherizedModuleName %>.component.css']<% } %>
})
export class <%= jsComponentName %>AppComponent {
  title = '<%= htmlComponentName %> works!';
}
