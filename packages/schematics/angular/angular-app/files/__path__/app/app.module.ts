import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
<% if (routing) { %>
import { AppRoutingModule } from './app-routing.module';<% } %>
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule<% if (routing) { %>,
    AppRoutingModule<% } %>
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
