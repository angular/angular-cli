import { NgModule, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'lazy-feature-comp',
  template: 'lazy feature!',
})
export class LazyFeatureComponent {}

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: LazyFeatureComponent, pathMatch: 'full' },
      {
        path: 'feature',
        loadChildren: () => import('./feature.module').then((m) => m.FeatureModule),
      },
    ]),
  ],
  declarations: [LazyFeatureComponent],
})
export class LazyFeatureModule {}
