import { Component } from '@angular/core';<% if (isMobile) { %>
import { APP_SHELL_DIRECTIVES } from '@angular/app-shell';<% } %>

@Component({
  moduleId: module.id,
  selector: '<%= prefix %>-root',
  <% if (isMobile) { %>template: `
  <h1>
    {{title}}
  </h1>
  `,
  styles: [],
  directives: [APP_SHELL_DIRECTIVES]<% } else { %>templateUrl: 'app.component.html',
  styleUrls: ['app.component.css']<% } %>
})
export class AppComponent {
  title = 'app works!';
}
