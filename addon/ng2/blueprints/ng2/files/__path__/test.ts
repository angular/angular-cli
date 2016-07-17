
/*global jasmine, __karma__, window*/
import 'core-js/es6';
import 'core-js/es7/reflect';

// Typescript emit helpers polyfill
import 'ts-helpers';

import 'zone.js/dist/zone';
import 'zone.js/dist/long-stack-trace-zone';
import 'zone.js/dist/jasmine-patch';
import 'zone.js/dist/async-test';
import 'zone.js/dist/fake-async-test';
import 'zone.js/dist/sync-test';

// RxJS
import 'rxjs/Rx';

Promise.all([
    System.import('@angular/core/testing'),
    System.import('@angular/platform-browser-dynamic/testing')
  ]).then(function (providers) {
    let testing = providers[0];
    let testingBrowser = providers[1];

    testing.setBaseTestProviders(
      testingBrowser.TEST_BROWSER_DYNAMIC_PLATFORM_PROVIDERS,
      testingBrowser.TEST_BROWSER_DYNAMIC_APPLICATION_PROVIDERS
    );
});

let testContext: any = require.context('../src', true, /\.spec\.ts/);
function requireAll(requireContext: any) {
  return requireContext.keys().map(requireContext);
}

requireAll(testContext);
