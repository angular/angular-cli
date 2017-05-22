import 'core-js/es7/reflect';
import {platformDynamicServer} from '@angular/platform-server';
import {AppModule} from './app.module';

platformDynamicServer().bootstrapModule(AppModule);
