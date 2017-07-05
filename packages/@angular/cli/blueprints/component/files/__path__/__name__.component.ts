import { Component, OnInit<% if(viewEncapsulation) { %>, ViewEncapsulation <% }%><% if(changeDetection) { %>, ChangeDetectionStrategy <% }%> } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
@Component({
  selector: '<%= selector %>',<% if(inlineTemplate) { %>
    template: `
    <p>
      <%= dasherizedModuleName %> Works!
    </p>
  `, <% } else { %>
  templateUrl: './<%= dasherizedModuleName %>.component.pug', <% } if (inlineStyle) { %>
    styles: [] <% } else { %>
      styleUrls: ['./<%= dasherizedModuleName %>.component.<%= styleExt %>'] <% } %><% if(viewEncapsulation) { %>,
        encapsulation: ViewEncapsulation.<%= viewEncapsulation %><% } if (changeDetection) { %>,
          changeDetection: ChangeDetectionStrategy.<%= changeDetection %><% } %>
})
export class <%= classifiedModuleName %>Component implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
