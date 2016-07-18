import { Component, OnInit } from '@angular/core';

@Component({
  moduleId: module.id,
  selector: '<%= selector %>',<% if(inlineTemplate) { %>
  template: `
    <p>
      <%= dasherizedModuleName %> Works!
    </p>
  `,<% } else { %>
  templateUrl: '<%= dasherizedModuleName %>.component.html',<% } if(inlineStyle) { %>
  styles: []<% } else { %>
  styleUrls: ['<%= dasherizedModuleName %>.component.css']<% } %>
})
export class <%= classifiedModuleName %>Component implements OnInit {

  constructor() {}

  ngOnInit() {
  }

}
