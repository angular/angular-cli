import 'core-js/proposals/reflect-metadata';
import {platformDynamicServer, renderModule} from '@angular/platform-server';
import {AppModule} from './app.module';

AppModule.testProp = 'testing';

platformDynamicServer().bootstrapModule(AppModule);

renderModule(AppModule, {
  document: '<app-root></app-root>',
  url: '/'
});
