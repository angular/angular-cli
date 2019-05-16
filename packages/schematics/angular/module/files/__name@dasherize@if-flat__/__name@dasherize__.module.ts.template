import { NgModule } from '@angular/core';<% if (commonModule) { %>
import { CommonModule } from '@angular/common';<% } %><% if (routing) { %>

import { <%= classify(name) %>RoutingModule } from './<%= dasherize(name) %>-routing.module';<% } %>

@NgModule({
  declarations: [],
  imports: [<% if (commonModule) { %>
    CommonModule<%= routing ? ',' : '' %><% } %><% if (routing) { %>
    <%= classify(name) %>RoutingModule<% } %>
  ]
})
export class <%= classify(name) %>Module { }
