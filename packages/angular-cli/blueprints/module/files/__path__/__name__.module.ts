import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';<% if (routing) { %>
import { <%= classifiedModuleName %>RoutingModule } from './<%= dasherizedModuleName %>-routing.module';<% } %>

<% if (prefix) { %>
export const ModulePrefix = '<%= prefix %>';
<% } %>
@NgModule({
  imports: [
    CommonModule<% if (routing) { %>,
    <%= classifiedModuleName %>RoutingModule<% } %>
  ],
  declarations: []
})
export class <%= classifiedModuleName %>Module { }
