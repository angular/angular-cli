// Typescript emit helpers polyfill
import 'ts-helpers';

import '@angular/core';
import '@angular/common';
import '@angular/compiler';
import '@angular/http';
import '@angular/router';
import '@angular/platform-browser';
import '@angular/platform-browser-dynamic';

<% if(isMobile) { %>
  import '@angular/app-shell';
<% } %>

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
