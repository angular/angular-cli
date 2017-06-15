import { Component } from '@angular/core';

@Component({
  selector: '<%= prefix %>-root',<% if (inlineTemplate) { %>
  template: `
    <h1>
      Welcome to {{title}}!!
    </h1><% if (routing) { %>
    <router-outlet></router-outlet><% } %>
  `,<% } else { %>
  templateUrl: './app.component.html',<% } %><% if (inlineStyle) { %>
  styles: []<% } else { %>
  styleUrls: ['./app.component.<%= styleExt %>']<% } %>
})
export class AppComponent {
  title = '<%= prefix %>';
}
