import { importProvidersFrom, mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ServerModule } from '@angular/platform-server';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config';

const serverConfig = mergeApplicationConfig(config, {
  providers: [importProvidersFrom(ServerModule)],
});

export default () => bootstrapApplication(AppComponent, serverConfig);
