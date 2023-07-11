import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

export const config: ApplicationConfig = {
  providers: [importProvidersFrom(BrowserModule.withServerTransition({ appId: 'ng' }))],
};
