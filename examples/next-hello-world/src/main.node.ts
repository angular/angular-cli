import { NgModule, Component } from '@angular/core';
import {
  NodeModule,
  NodeHttpModule,
  NodeJsonpModule,
  platformDynamicNode,
} from '@angular/universal';

import { App } from './app';


@Component({
  selector: 'another-component',
  template: 'SERVER-RENDERED'
})
class AnotherComponent {}

export const platform = platformDynamicNode();

export function main(document) {

  @NgModule({
    bootstrap: [ App, AnotherComponent ],
    declarations: [ App, AnotherComponent ],
    imports: [
      NodeModule.forDocument(document, {
        originUrl: 'http://localhost:3000',
        baseUrl: '/',
        requestUrl: '/'
      }),
      NodeHttpModule,
      NodeJsonpModule
    ],
    providers: [
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


