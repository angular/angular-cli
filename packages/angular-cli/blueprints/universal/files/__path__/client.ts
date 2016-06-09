/**
 * the polyfills must be the first thing imported
 */
import 'angular2-universal-polyfills';
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

/**
 * bootstrap Angular 2 on document ready
 */
document.addEventListener('DOMContentLoaded', () => {
  platformRef.bootstrapModule(AppModule);
});
