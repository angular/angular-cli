import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
<% if (routing) { %>
import { AppRoutingModule } from './app-routing.module';<% } %>
<% if (serviceWorker) { %>
import { ServiceWorkerModule } from '@angular/service-worker';<% } %>
import { AppComponent } from './app.component';
<% if (serviceWorker) { %>
import { environment } from '../environments/environment';<% } %>

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule<% if (routing) { %>,
    AppRoutingModule<% } %><% if (serviceWorker) { %>,
    environment.production ? ServiceWorkerModule.register('/ngsw-worker.js') : []<% } %>
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
