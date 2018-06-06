/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModule, Component } from '@angular/core';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'feature-component',
  template: '<h2>lazy/feature!</h2>'
})
export class FeatureComponent { }

@NgModule({
  declarations: [
    FeatureComponent
  ],
  imports: [
    RouterModule.forChild([
      { path: '', component: FeatureComponent }
    ])
  ]
})
export class FeatureModule { }
