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

export function main(document, config?: any) {

  @NgModule({
    bootstrap: [ App, AnotherComponent ],
    declarations: [ App, AnotherComponent ],
    imports: [
      NodeModule.forRoot(document, {
        originUrl: 'http://localhost:3000',
        baseUrl: '/',
        requestUrl: '/',
        preboot: {
          appRoot: ['app'],
          uglify: true
        }
      }),
      NodeHttpModule,
      NodeJsonpModule
    ],
    providers: [
    ]
  })
  class MainModule {
    // ngOnInit() {
    //   console.log('ngOnInit');
    // }
    // ngDoCheck() {
    //   console.log('ngDoCheck');
    // }
    // ngOnStable() {
    //   console.log('ngOnStable');
    // }
    // ngOnRendered() {
    //   console.log('ngOnRendered');
    // }
  }

  return platform
    .serializeModule(MainModule, config)
    .then((html) => {
      console.log('\n-----------\n')
      return html
    });
};


