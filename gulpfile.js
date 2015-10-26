var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    util = require('gulp-util'),
    umd = require('gulp-umd');

var sources = {
  batoh: './src/batoh.js',
  backbone: './src/backbone_sync.js',
};

var dependencies = {
  jquery: {
    name: 'jquery',
    amd: 'jquery',
    cjs: 'jquery',
    global: '$',
    param: 'jquery'
  }
};

function deps() {
  var dep = [];
  if (util.env.backbone) dep.push(dependencies.jquery);
  return function() {
    return dep;
  };
}

gulp.task('lint', function() {
  var sources = './src/**/*.js';
  var tests = './test/**/*.js';
  return gulp.src([sources, tests])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('dist', function() {
  var src = [];
  src.push(sources.batoh);
  if (util.env.backbone) src.push(sources.backbone);
  return gulp.src(src)
    .pipe(concat('batoh.js'))
    .pipe(umd({ dependencies: deps() }))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('batoh.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('test', function() {
  // TODO
});

gulp.task('default', function() {
  gulp.start('lint', 'dist');
});
