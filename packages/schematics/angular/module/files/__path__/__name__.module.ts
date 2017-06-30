import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';<% if (routing) { %>

import { <%= classify(name) %>RoutingModule } from './<%= dasherizedModuleName %>-routing.module';<% } %>

@NgModule({
  imports: [
    CommonModule<% if (routing) { %>,
    <%= classify(name) %>RoutingModule<% } %>
  ],
  declarations: []
})
export class <%= classify(name) %>Module { }
