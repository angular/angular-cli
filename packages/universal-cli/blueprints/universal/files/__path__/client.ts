/**
 * the polyfills must be the first thing imported
 */
import './polyfills.ts';
import './__2.1.1.workaround.ts'; // temporary until 2.1.1 things are patched in Core
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { platformUniversalDynamic } from 'angular2-universal';
import { AppModule } from './app/app.browser.module';

/**
 * enable prod mode for production environments
 */
if (environment.production) {
  enableProdMode();
}

const platformRef = platformUniversalDynamic();

platformRef.bootstrapModule(AppModule);
