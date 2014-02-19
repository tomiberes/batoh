// Gulp base
var gulp = require('gulp');
// Gulp plugins
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
// Other modules

gulp.task('lint', function() {
  var sources = './src/**/*.js';
  var tests = './test/**/*.js';
  return gulp.src([sources, tests])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('test', function() {
  // TODO: karma tests
});

gulp.task('dist-solo', function() {
  var sources = ['src/batoh.js'];
  return gulp.src(sources)
    .pipe(gulp.dest('./dist'))
    .pipe(rename('batoh.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('dist-sync', function() {
  var sources = ['src/batoh.js', 'src/sync.js'];
  return gulp.src(sources)
    .pipe(concat('batoh-s.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('batoh-s.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('dist-backbone', function() {
  var sources = ['src/batoh.js', 'src/adapters/backbone-adapter.js'];
  return gulp.src(sources)
    .pipe(concat('batoh-bb.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('batoh-bb.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('dist-sync-backbone', function() {
  var sources = ['src/batoh.js', 'src/sync.js', 'src/adapters/backbone-adapter.js'];
  return gulp.src(sources)
    .pipe(concat('batoh-s-bb.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('batoh-s-bb.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('dist', function() {
  gulp.run('dist-solo', 'dist-sync', 'dist-backbone', 'dist-sync-backbone');
});

gulp.task('default', function() {
  gulp.run('lint', 'dist');
});
