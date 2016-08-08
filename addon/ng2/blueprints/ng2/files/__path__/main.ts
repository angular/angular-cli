import { bootstrap } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { APP_ROUTER_PROVIDERS, AppComponent, environment } from './app/';<% if(isMobile) { %>
import { APP_SHELL_RUNTIME_PROVIDERS } from '@angular/app-shell';<% } %>

if (environment.production) {
  enableProdMode();
}

bootstrap(AppComponent, [
  APP_ROUTER_PROVIDERS<% if(isMobile) { %>,
  APP_SHELL_RUNTIME_PROVIDERS<% } %>
]);
