var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');

function compile(src, dest, name, watch)
{
  var bundler = browserify(src, { debug: true }).transform(babel);

  if (watch)
  {
    bundler = watchify(bundler);
  }

  function rebundle()
  {
    bundler.bundle()
      .on('error', function(err) { console.error(err); this.emit('end'); })
      .pipe(source('build.js'))
      .pipe(rename(name))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(dest));
  }

  if (watch)
  {
    bundler.on('update', function()
    {
      console.log('-> building scripts...');
      rebundle();
    });
  }

  rebundle();
}

module.exports = compile;