/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/* tslint:disable component-selector */
import { Component } from '@angular/core';
import { LocationService } from 'app/shared/location.service';

/**
 * A simple embedded component that displays the current location path
 */
@Component({
  selector: 'current-location',
  template: '{{ location.currentPath | async }}'
})
export class CurrentLocationComponent {
  constructor(public location: LocationService) {
  }
}
