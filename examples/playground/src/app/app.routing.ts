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


const crisisCenterRoutes = [
  {
    path: '',
    redirectTo: '/heroes',
    pathMatch: 'full'
  },
  {
    path: 'crisis-center',
    loadChildren: () => System.import('./crisis-center/crisis-center.module').then(mod => mod && mod.default || mod)
  }
];

const appRoutes = [
  ...loginRoutes,
  ...crisisCenterRoutes
];

export const appRoutingProviders: any[] = [
  authProviders,
  CanDeactivateGuard
];

export const routing = RouterModule.forRoot(appRoutes);
