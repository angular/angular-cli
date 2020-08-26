import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LazyCompComponent } from './lazy-comp/lazy-comp.component';


const routes: Routes = [{ path: '', component: LazyCompComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LazyRoutingModule { }
