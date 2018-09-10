<%= experimentalIvy ? '// ' : '' %>import { enableProdMode } from '@angular/core';
<%= experimentalIvy ? '// ' : '' %>import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
<%= experimentalIvy ? '// ' : '' %>
<%= experimentalIvy ? '// ' : '' %>import { AppModule } from './app/app.module';
<%= experimentalIvy ? '// ' : '' %>import { environment } from './environments/environment';
<%= experimentalIvy ? '// ' : '' %>
<%= experimentalIvy ? '// ' : '' %>if (environment.production) {
<%= experimentalIvy ? '// ' : '' %>  enableProdMode();
<%= experimentalIvy ? '// ' : '' %>}
<%= experimentalIvy ? '// ' : '' %>
<%= experimentalIvy ? '// ' : '' %>platformBrowserDynamic().bootstrapModule(AppModule)
<%= experimentalIvy ? '// ' : '' %>  .catch(err => console.error(err));
<% if (experimentalIvy) { %>
import { AppComponent } from './app/app.component';
import { ɵrenderComponent as renderComponent } from '@angular/core';

renderComponent(AppComponent);
<% } %>
