import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { routing } from './<%= dasherizedModuleName %>.routes';
import { <%= classifiedModuleName %>Component } from './<%= dasherizedModuleName %>.component';

@NgModule({
  imports: [
    CommonModule,
    routing
  ],
  declarations: [
    <%= classifiedModuleName %>Component
  ]
})
export class <%= classifiedModuleName %>Module { }
