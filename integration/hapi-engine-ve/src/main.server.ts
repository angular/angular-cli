import { enableProdMode } from '@angular/core';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

export { AppServerModule } from './app/app.server.module';
export { AppServerModuleNgFactory } from './app/app.server.module.ngfactory';
export { renderModule, renderModuleFactory } from '@angular/platform-server';
