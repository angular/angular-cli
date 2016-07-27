import 'angular2-universal-polyfills';
import { provide } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { APP_SHELL_BUILD_PROVIDERS } from '@angular/app-shell';
import { 
  REQUEST_URL, 
  ORIGIN_URL, 
  Bootloader, 
  BootloaderConfig, 
  AppConfig 
} from 'angular2-universal';
import { AppComponent } from './app/';

const bootloaderConfig: BootloaderConfig = {
  platformProviders: [
    APP_SHELL_BUILD_PROVIDERS,
    provide(ORIGIN_URL, {
      useValue: 'http://localhost:4200' // full urls are needed for node xhr
    }),
    provide(APP_BASE_HREF, { useValue: '/' }),
  ],
  async: true,
  preboot: false
}

const appConfig: AppConfig = {
  directives: [
    // The component that will become the main App Shell
    AppComponent
  ],
  providers: [
    // What URL should Angular be treating the app as if navigating
    provide(REQUEST_URL, { useValue: '/' })
  ]
}

export function getBootloader() : Bootloader  {
  return new Bootloader(bootloaderConfig);
}

export function serialize(bootloader: Bootloader, template: string) : string {
  appConfig.template = template;
  return bootloader.serializeApplication(appConfig);
}