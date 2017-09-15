import { Component } from '@angular/core';

@Component({
  selector: '<%= selector %>',<% if(inlineTemplate) { %>
  template: `
    <p>
      app Works!
    </p><% if(routing) { %>
    <router-outlet></router-outlet><% } %>
  `,<% } else { %>
  templateUrl: './app.component.html',<% } if(inlineStyle) { %>
  styles: []<% } else { %>
  styleUrls: ['./app.component.<%= styleext %>']<% } %>
})
export class AppComponent {
  title = '<%= prefix %>';
}
