import { ModuleWithProviders }   from '@angular/core';
import { Routes, RouterModule }  from '@angular/router';

import { CrisisCenterComponent } from './crisis-center.component';
import { CrisisDetailComponent } from './crisis-detail.component';
import { CrisisListComponent }   from './crisis-list.component';
import { CrisisAdminComponent }  from './crisis-admin.component';

import { CanDeactivateGuard }    from '../can-deactivate-guard.service';
import { AuthGuard }             from '../auth-guard.service';
import { CrisisDetailResolve }   from './crisis-detail-resolve.service';


const crisisCenterRoutes: Routes = [
  {
    path: '',
    component: CrisisCenterComponent,
    children: [
      {
        path: 'admin',
        component: CrisisAdminComponent,
        canActivate: [AuthGuard]
      },
      {
        path: ':id',
        component: CrisisDetailComponent,
        canDeactivate: [CanDeactivateGuard],
        resolve: {
          crisis: CrisisDetailResolve
        }
      },
      {
        path: '',
        component: CrisisListComponent
      }
    ]
  }
];

export const crisisCenterRouting: ModuleWithProviders = RouterModule.forChild(crisisCenterRoutes);


/*
Copyright 2016 Google Inc. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/
