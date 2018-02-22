const {join} = require('path');

const {patchTestBed} = require('./patch-testbed');
const Jasmine = new (require('jasmine'))({projectBaseDir: join(__dirname, '..')});

require('zone.js');
require('zone.js/dist/zone-testing');
const {TestBed} = require('@angular/core/testing');
const {ServerTestingModule, platformServerTesting} = require('@angular/platform-server/testing');
let testBed = TestBed.initTestEnvironment(
  ServerTestingModule,
  platformServerTesting()
);

patchTestBed(testBed);
Jasmine.loadConfigFile('test/jasmine.conf.json');
Jasmine.execute();
