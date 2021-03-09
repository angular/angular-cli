import {NgModule, Component} from '@angular/core';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'lazy-comp',
  template: 'lazy!'
})
export class LazyComponent {}

@NgModule({
  imports: [
    RouterModule.forChild([
     {path: '', component: LazyComponent, pathMatch: 'full'},
     {path: 'feature', loadChildren: () => import( './feature/feature.module').then(m => m.FeatureModule)},
     {path: 'lazy-feature', loadChildren: () => import( './feature/lazy-feature.module').then(m => m.LazyFeatureModule)},
    ]),
  ],
  declarations: [LazyComponent]
})
export class LazyModule {}

export class SecondModule {}
