/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModule } from '@angular/core';
import { MdSnackBarModule } from '@angular/material';
import { ServiceWorkerModule } from '@angular/service-worker';

import { globalProvider } from './global.value';
import { SwUpdateNotificationsService } from './sw-update-notifications.service';
import { SwUpdatesService } from './sw-updates.service';


@NgModule({
  imports: [
    MdSnackBarModule,
    ServiceWorkerModule
  ],
  providers: [
    globalProvider,
    SwUpdateNotificationsService,
    SwUpdatesService
  ]
})
export class SwUpdatesModule {}
