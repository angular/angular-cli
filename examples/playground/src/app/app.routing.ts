import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule }   from '@angular/router';

import { loginRoutes, authProviders }  from './login.routing';

import { CanDeactivateGuard } from './can-deactivate-guard.service';

// Won't read this from custom-typings (no idea why)
declare var ENV: string;
declare var HMR: boolean;
declare var System: SystemJS;

interface SystemJS {
  import: (path?: string) => Promise<any>;
}
// Temporary placeholder ^


const crisisCenterRoutes: Routes = [
  {
    path: '',
    redirectTo: '/heroes',
    pathMatch: 'full'
  },
  {
    path: 'crisis-center',
    loadChildren: () => System.import('app/crisis-center/crisis-center.module')
  }
];

const appRoutes: Routes = [
  ...loginRoutes,
  ...crisisCenterRoutes
];

export const appRoutingProviders: any[] = [
  authProviders,
  CanDeactivateGuard
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
