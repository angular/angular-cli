import { NgModule, enableProdMode } from '@angular/core';
import { AppShellModule } from '@angular/app-shell';
import { UniversalModule } from 'angular2-universal';
import { AppComponent } from './app';

enableProdMode();

@NgModule({
  imports: [
    UniversalModule,
    AppShellModule.prerender()
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class Module {}
