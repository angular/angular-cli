import {provide} from '@angular/core';
import {APP_BASE_HREF} from '@angular/common';
import {<%= jsComponentName %>AppComponent} from './app/';
import {
  REQUEST_URL,
  ORIGIN_URL
} from 'angular2-universal';

export const options = {
  directives: [
    // The component that will become the main App Shell
    <%= jsComponentName %>AppComponent
  ],
  platformProviders: [
    provide(ORIGIN_URL, {
      useValue: ''
    })
  ],
  providers: [
    // What URL should Angular be treating the app as if navigating
    provide(APP_BASE_HREF, {useValue: '/'}),
    provide(REQUEST_URL, {useValue: '/'})
  ],
  async: false,
  preboot: false
};

