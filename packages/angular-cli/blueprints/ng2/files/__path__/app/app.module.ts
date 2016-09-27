import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';<% if (routing) { %>
import { <%= classifiedModuleName %>RoutingModule } from './<%= dasherizedModuleName %>-routing.module';<% } %>

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule<% if (routing) { %>,
    <%= classifiedModuleName %>RoutingModule<% } %>
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
