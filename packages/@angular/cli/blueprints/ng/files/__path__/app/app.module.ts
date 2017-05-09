import { BrowserModule } from '@angular/platform-browser';<% if (animation) { %>
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';<% } %>
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
    BrowserModule,<% if (animation) { %>
    BrowserAnimationsModule,<% } %>
    FormsModule,
    HttpModule<% if (routing) { %>,
    AppRoutingModule<% } %>
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
