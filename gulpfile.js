var gulp = require('gulp');
var preboot = require('preboot');

gulp.task('preboot', function() {
  return preboot.
    getClientCodeStream({
      appRoot:     'app',         // selector for Angular root element
      replay:      'rerender',    // Angular will re-render the view
      freeze:      'spinner',     // show spinner w button click & freeze page
      focus:       true,          // maintain focus after re-rendering
      buffer:      true,          // client app will write to hidden div until bootstrap complete
      keyPress:    true,          // all keystrokes in text elements recorded
      uglify:      true,
      buttonPress: true           // when button pressed, record and freeze page
    }).
    pipe(gulp.dest('web_modules'));
});
