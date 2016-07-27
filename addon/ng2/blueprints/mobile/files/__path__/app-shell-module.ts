import { NgModule, ModuleWithProviders } from '@angular/core';
import {
  APP_SHELL_DIRECTIVES,
  APP_SHELL_RUNTIME_PROVIDERS,
  APP_SHELL_BUILD_PROVIDERS
} from '@angular/app-shell';

@NgModule({
  declarations: APP_SHELL_DIRECTIVES,
  exports: APP_SHELL_DIRECTIVES
})
export class AppShellModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: AppShellModule,
      providers: [APP_SHELL_RUNTIME_PROVIDERS, APP_SHELL_BUILD_PROVIDERS]
    };
  }
}
