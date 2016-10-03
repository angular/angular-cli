// Angular Core Modules
import { NgModule } from '@angular/core';

// Universal imports
import {
  NodeModule,
  NodeHttpModule,
  NodeJsonpModule,
  // Node "platform" (think "platformBrowserDynamic" on the browser)
  platformDynamicNode
} from '@angular/universal';

// Our Root Component
import { AppComponent } from './app';
// Our Root routing & routingProviders
import { routing, appRoutingProviders } from './app';

import { HeroesModule } from './app/heroes/heroes.module';
import { LoginComponent } from './app/login.component';
import { DialogService }  from './app/dialog.service';

// We want to export the entire main function to be called from Node
export function main(document, config?: any) {

  // Universal Container (aka Module)
  @NgModule({
    // These are identical to the Browser NgModule (in app.browser.module.ts)
    bootstrap    : [ AppComponent ],
    declarations : [ AppComponent, LoginComponent ],

    // As opposed to the normal "BrowserModule, HttpModule, JsonpModule" imports
    // in our Browser NgModule (found in app.browser.module.ts)
    // Here we need to import Node specific modules for Universal
    imports: [

      HeroesModule,
      routing,

      // NodeModule from "@angular/universal" allows us to provide a config object
      NodeModule.withConfig({
        // Our "document" which we need to pass in from Node
        // (first param of this main function)
        document: document,

        originUrl: 'http://localhost:3000',
        baseUrl: '/',
        requestUrl: '/',
        // Preboot [Transfer state between Server & Client]
        // More info can be found at: https://github.com/angular/preboot#options
        preboot: {
          appRoot : [ 'app' ], // selector(s) for app(s) on the page
          uglify  : true       // uglify preboot code
        },
      }),

      // Other important Modules for Universal
      NodeHttpModule, // Universal Http
      NodeJsonpModule // Universal JSONP

    ],

    providers: [
      appRoutingProviders,
      DialogService
    ]
  })
  class MainModule { }

  // -----------------------
  // On the browser:
  // platformBrowserDynamic().bootstrapModule(MainModule);
  // But in Node, we don't "bootstrap" our application, we want to Serialize it!

  return platformDynamicNode().serializeModule(MainModule, config);
  // serializeModule returns a promise
  // (just like bootstrapModule on the browser does)

};


