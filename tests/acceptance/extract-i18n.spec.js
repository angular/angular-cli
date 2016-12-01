const tmp = require('../helpers/tmp');
const ng = require('../helpers/ng');
const existsSync = require('exists-sync');
const path = require('path');
const root = process.cwd();
const expect = require('chai').expect;

// TODO: Enable when tests get validated
describe.skip('Acceptance: ng xi18n', function() {
  beforeEach(function() {
    this.timeout(180000);
    return tmp.setup('./tmp').then(function() {
      process.chdir('./tmp');
    }).then(function() {
      return ng(['new', 'foo', '--link-cli']);
    });
  });

  afterEach(function() {
    this.timeout(10000);

    return tmp.teardown('./tmp');
  });

  it('ng xi18n', function() {
    this.timeout(10000);

    const appRoot = path.join(root, 'tmp/foo');
    const messagesPath = path.join(appRoot, 'src/messages.xlf');

    return ng(['xi18n'])
      .then(() => {
        expect(existsSync(messagesPath)).to.equal(true);
      });

  });

  it('ng xi18n --format=xmb', function() {
    this.timeout(10000);

    const appRoot = path.join(root, 'tmp/foo');
    const messagesPath = path.join(appRoot, 'src/messages.xmb');

    return ng(['xi18n', '--format=xmb'])
      .then(() => {
        expect(existsSync(messagesPath)).to.equal(true);
      });

  });

});
