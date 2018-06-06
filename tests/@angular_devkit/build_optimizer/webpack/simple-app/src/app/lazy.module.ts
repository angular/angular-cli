/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModule, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpModule, Http } from '@angular/http';


@Component({
  selector: 'lazy-comp',
  template: '<h2>lazy!</h2>'
})
export class LazyComponent { }

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: LazyComponent, pathMatch: 'full' },
      { path: 'feature', loadChildren: './feature.module#FeatureModule' }
    ]),
    HttpModule
  ],
  declarations: [LazyComponent]
})
export class LazyModule {
  constructor(http: Http) { }
}

export class SecondModule { }
