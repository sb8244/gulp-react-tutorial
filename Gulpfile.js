var gulp = require('gulp');

var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');

var sass = require('gulp-sass');
var bower = require('gulp-bower');
var sourcemaps = require('gulp-sourcemaps');
var minifyCss = require('gulp-minify-css');
var util = require('gulp-util');

var bowerResolve = require('bower-resolve');
var source = require('vinyl-source-stream');

var config = {
  sassPath: './app/assets/stylesheets',
  jsPath: './app/assets/javascripts',
  bowerDir: './vendor/assets/components',
  requireFiles: ['./node_modules/react/react.js'],
  production: !!util.env.production
};

gulp.task('compile-scss', function() {
  return gulp.src(config.sassPath + '/application.scss')
    .on('error', function(E) {
      console.log(E);
    })
    .pipe(sourcemaps.init())
    .pipe(sass({
      errLogToConsole: true,
      indentedSyntax: false,
      includePaths: [
        config.bowerDir + '/bootstrap-sass/assets/stylesheets'
      ]
    }))
    .pipe(config.production ? minifyCss() : util.noop())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./public/stylesheets'));
});

function browserifyShare(watch) {
  bowerResolve.init(function() {
    var entryFile = config.jsPath + '/application.js';
    var b = browserify(entryFile, {
      debug: !config.production,
      cache: {},
      packageCache: {},
      fullPaths: true
    }).require(config.requireFiles)
      .transform(babelify)
      .plugin('minifyify', {output: 'public/javascripts/application.js.map', map: '/javascripts/application.js.map'})
      .require(bowerResolve('jquery'), {expose: 'jquery'});

    if (watch) {
      b = watchify(b);
      b.on('update', function() {
        bundleShare(b);
      });
    }

    bundleShare(b);
  });
}

function bundleShare(b) {
  return b.bundle()
    .on('error', function(E) { console.log(E); })
    .pipe(source('application.js'))
    .pipe(gulp.dest('public/javascripts'));
}

gulp.task('default', ['compile-scss', 'js']);

gulp.task('watch', ['watch-scss', 'watch-js']);

gulp.task('watch-scss', function() {
  gulp.watch('app/assets/stylesheets/**/*.scss', ['compile-scss']);
});

gulp.task('js', function() {
  browserifyShare(false);
});

gulp.task('watch-js', function() {
  browserifyShare(true);
});
