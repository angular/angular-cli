import 'core-js/es7/reflect';
import {platformBrowser} from '@angular/platform-browser';
import {AppModuleNgFactory} from './ngfactory/app/app.module.ngfactory';

platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
