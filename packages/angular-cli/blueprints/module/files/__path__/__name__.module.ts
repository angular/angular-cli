import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';<% if (routing) { %>
import { <%= camelizedModuleName %>Routing } from './<%= dasherizedModuleName %>.routing';<% } %>

@NgModule({
  imports: [
    CommonModule<% if (routing) { %>,
    <%= camelizedModuleName %>Routing<% } %>
  ],
  declarations: []
})
export class <%= classifiedModuleName %>Module { }
