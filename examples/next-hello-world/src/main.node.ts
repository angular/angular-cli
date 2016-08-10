import { NgModule } from '@angular/core';
import {
  NodeModule,
  NodeHttpModule,
  NodeJsonpModule,
  platformDynamicNode,
  ORIGIN_URL
} from '@angular/universal';

import { App } from './app';
import { APP_BASE_HREF } from '@angular/common';


export const platform = platformDynamicNode([

]);

export function main(doc) {

  @NgModule({
    bootstrap: [ App ],
    declarations: [ App ],
    imports: [
      NodeModule.forDocument(doc),
      NodeHttpModule,
      NodeJsonpModule
    ],
    providers: [
      { provide: APP_BASE_HREF, useValue: '/' },
      { provide: ORIGIN_URL, useValue: 'http://localhost:3000' }
    ]
  })
  class MainModule {}

  return platform
    .serializeModule(MainModule)
    .then((html) => {
      console.log('done')
      return html
    });
};


