import { NgModule, Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { MyInjectable } from './injectable';


@Component({
  selector: 'home-view',
  template: '<h2>home!</h2>'
})
export class HomeView { }


@NgModule({
  declarations: [
    AppComponent,
    HomeView
  ],
  providers: [
    MyInjectable
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      { path: 'lazy', loadChildren: './lazy.module#LazyModule' },
      { path: '', component: HomeView }
    ])
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
