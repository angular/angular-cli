import 'core-js/es7/reflect';
import {platformDynamicServer} from '@angular/platform-server';
import {AppModule} from './app.module';

AppModule.testProp = 'testing';

platformDynamicServer().bootstrapModule(AppModule);
