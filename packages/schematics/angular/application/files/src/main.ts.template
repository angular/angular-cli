import { enableProdMode<% if(!!viewEncapsulation) { %>, ViewEncapsulation<% }%> } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}
<% if(!!viewEncapsulation) { %>
platformBrowserDynamic().bootstrapModule(AppModule, {
  defaultEncapsulation: ViewEncapsulation.<%= viewEncapsulation %>
})
  .catch(err => console.error(err));
<% } else { %>
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
<% } %>