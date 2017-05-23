import { Component, OnInit<% if(viewEncapsulation) { %>, ViewEncapsulation<% }%><% if(changeDetection) { %>, ChangeDetectionStrategy<% }%> } from '@angular/core';

@Component({
  selector: '<%= dasherize(name) %>',<% if(inlineTemplate) { %>
  template: `
    <p>
      <%= dasherize(name) %> Works!
    </p>
  `,<% } else { %>
  templateUrl: './<%= dasherize(name) %>.component.html',<% } if(inlineStyle) { %>
  styles: []<% } else { %>
  styleUrls: ['./<%= dasherize(name) %>.component.<%= styleext %>']<% } %><% if(viewEncapsulation) { %>,
  encapsulation: ViewEncapsulation.<%= viewEncapsulation %><% } if (changeDetection) { %>,
  changeDetection: ChangeDetectionStrategy.<%= changeDetection %><% } %>
})
export class <%= classify(name) %>Component implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
