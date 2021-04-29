import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FooBarComponent } from './foo-bar/foo-bar.component';
import { FooComponent } from './foo/foo.component';
import { AppComponent } from './app.component';

const routes: Routes = [
  {
    path: '',
    component: AppComponent,
  },
  {
    path: 'foo/bar',
    component: FooBarComponent,
  },
  {
    path: 'foo',
    component: FooComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
