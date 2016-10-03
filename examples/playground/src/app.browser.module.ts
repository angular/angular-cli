
// Angular Core Modules
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule, JsonpModule } from '@angular/http';
import { FormsModule }    from '@angular/forms';


// Browser Bootstrap Module
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// Our Root Component
import { AppComponent } from './app';
// Our Root routing & routingProviders
import { routing, appRoutingProviders } from './app';

import { HeroesModule } from './app/heroes/heroes.module';
import { LoginComponent } from './app/login.component';
import { DialogService }  from './app/dialog.service';


// Browser Container (aka Module)
@NgModule({
  bootstrap    : [ AppComponent ],
  declarations : [ AppComponent, LoginComponent ],
  imports : [
    // Standard imports
    BrowserModule,
    HttpModule,
    JsonpModule,
    FormsModule,

    // Our imports
    HeroesModule,
    routing
  ],
  providers: [
    appRoutingProviders,
    DialogService
  ]
})
export class MainModule { }

export function main() {
  // Create our browser "platform"
  // & Bootstrap our NgModule/Container to it
  return platformBrowserDynamic().bootstrapModule(MainModule);
}
