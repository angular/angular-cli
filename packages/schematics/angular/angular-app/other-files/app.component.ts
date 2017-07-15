import { Component, OnInit<% if(viewEncapsulation) { %>, ViewEncapsulation<% }%><% if(changeDetection) { %>, ChangeDetectionStrategy<% }%> } from '@angular/core';

@Component({
  selector: '<%= selector %>',<% if(inlineTemplate) { %>
  template: `
    <p>
      app Works!
    </p>
  `,<% } else { %>
  templateUrl: './app.component.html',<% } if(inlineStyle) { %>
  styles: []<% } else { %>
  styleUrls: ['./app.component.<%= styleext %>']<% } %><% if(viewEncapsulation) { %>,
  encapsulation: ViewEncapsulation.<%= viewEncapsulation %><% } if (changeDetection) { %>,
  changeDetection: ChangeDetectionStrategy.<%= changeDetection %><% } %>
})
export class AppComponent implements OnInit {
  title = '<%= prefix %>';

  constructor() { }

  ngOnInit() {
  }

}
