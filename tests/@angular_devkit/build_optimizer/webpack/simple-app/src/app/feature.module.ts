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
