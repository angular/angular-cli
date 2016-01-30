var universal = require('angular2-universal-preview');
var gulp = require('gulp');
var through = require('through2');
var gutil = require('gutil');

var PluginError = gutil.PluginError;

module.exports = function gulpAngular2Render(config) {
  return through.obj(function transform(file, enc, cb) {
    if (file.isStream()) {
      return cb(new PluginError('angular2-gulp-prerender', 'Streaming is not supported'));
    }
    var str = file.contents.toString();

    var renderPromise = universal.renderToString;
    var args = [config.App, config.providers];
    if (config.preboot) {
      renderPromise = universal.renderToStringWithPreboot;
      args.push(config.preboot);
    }

    renderPromise.apply(null, args)
    .then(function(serializedApp) {
      var html = str.replace(
        // <selector></selector>
        selectorRegExpFactory(universal.selectorResolver(config.App)),
        // <selector>{{ serializedCmp }}</selector>
        serializedApp
      );

      file.contents = new Buffer(html);

      cb(null, file)
    });
  });
}

