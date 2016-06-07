'use strict';

var ng = require('../helpers/ng');
var path = require('path');
var tmp = require('../helpers/tmp');
var conf = require('ember-cli/tests/helpers/conf');
var child_process = require('child_process');
var treeKill = require('tree-kill');

const ngBin = `node ${path.join(process.cwd(), 'bin', 'ng')}`;

describe('Acceptance: ng e2e', function () {
  before(conf.setup);

  after(function() {
    this.timeout(4200000);
         
    conf.restore;
    return tmp.teardown('./tmp');
  });

  beforeEach(function () {
    this.timeout(4200000);

    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    });
  });

  it('ng e2e completes successfully after serving project', function () {
    this.timeout(240000);

    var ngServePid;
    var ngE2ePid;

    function executor(resolve, reject) {
      var serveProcess = child_process.exec(`${ngBin} serve`);
      var startedProtractor = false;
      ngServePid = serveProcess.pid;

      serveProcess.stdout.on('data', (data) => {
        if (/Build successful/.test(data) && !startedProtractor) {
          startedProtractor = true;
          var e2eProcess = child_process.exec(`${ngBin} e2e`);
          ngE2ePid = e2eProcess.pid;

          e2eProcess.then((error, stdout, stderr) => {
            if (error !== null) {
              reject(stderr);
            } else {
              resolve();
            }
          });
        } else if (/ failed with:/.test(data)) {
          reject(data);
        }
      });

      serveProcess.stderr.on('data', (data) => {
        reject(data);
      });
      serveProcess.on('close', (code) => {
        code === 0 ? resolve() : reject('ng serve command closed with error')
      });
    }

    return ng(['new', 'test-project'])
      .then(new Promise(executor)
        .then(() => {
          if (ngServePid) { treeKill(ngServePid); }
          if (ngE2ePid) { treeKill(ngE2ePid); }
        })
        .catch((msg) => {
          if (ngServePid) treeKill(ngServePid);
          if (ngE2ePid) { treeKill(ngE2ePid); }          
          throw new Error(msg);
        }));
  });

  it('ng e2e fails with exit code', function () {
    this.timeout(240000);

    var ngE2ePid;
    var e2eProcess;

    function executor(resolve, reject) {
      e2eProcess = child_process.exec(`${ngBin} e2e`);
      ngE2ePid = e2eProcess.pid;

      e2eProcess.stderr.on('data', (data) => {
        reject(data);
      })

      e2eProcess.on('close', (code) => {
        code !== 0 ? resolve() : reject('ng e2e command closed with error')
      });

    }

    return new Promise(executor)
      .then(() => {
        if (ngE2ePid) treeKill(ngE2ePid);
      })
      .catch((msg) => {
        if (ngE2ePid) treeKill(ngE2ePid);
        throw new Error(msg);
      });
  });
});
