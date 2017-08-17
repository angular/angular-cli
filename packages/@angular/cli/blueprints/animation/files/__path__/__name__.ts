import { Component, OnInit, trigger, state, style, transition, animate } from '@angular/core';
export const <%= classifiedModuleName %> = trigger('<%= classifiedModuleName %>', [
  state('statea', style({
  })),
  state('stateb', style({
  })),
  transition('statea <=> stateb', animate('250ms ease-in'))
]);
