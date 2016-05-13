import { Component } from '@angular/core';

@Component({
  moduleId: module.id,
  selector: '<%= htmlComponentName %>-app',
  <% if (isMobile) { %>template: `
  <h1>
    {{title}}
  </h1>
  `,
  styles: []<% } else { %>templateUrl: '<%= htmlComponentName %>.component.html',
  styleUrls: ['<%= dasherizedModuleName %>.component.css']<% } %>
})
export class <%= jsComponentName %>AppComponent {
  title = '<%= htmlComponentName %> works!';
}
