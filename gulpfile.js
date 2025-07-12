const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const browserSync = require('browser-sync').create();

// Copy third party libraries from /node_modules into /vendor
function vendor() {
  // Bootstrap
  gulp.src([
    './node_modules/bootstrap/dist/**/*',
    '!./node_modules/bootstrap/dist/css/bootstrap-grid*',
    '!./node_modules/bootstrap/dist/css/bootstrap-reboot*'
  ])
  .pipe(gulp.dest('./vendor/bootstrap'));

  // Devicons
  gulp.src([
    './node_modules/devicons/**/*',
    '!./node_modules/devicons/*.json',
    '!./node_modules/devicons/*.md',
    '!./node_modules/devicons/!PNG',
    '!./node_modules/devicons/!PNG/**/*',
    '!./node_modules/devicons/!SVG',
    '!./node_modules/devicons/!SVG/**/*'
  ])
  .pipe(gulp.dest('./vendor/devicons'));

  // Font Awesome
  gulp.src([
    './node_modules/font-awesome/**/*',
    '!./node_modules/font-awesome/{less,less/*}',
    '!./node_modules/font-awesome/{scss,scss/*}',
    '!./node_modules/font-awesome/.*',
    '!./node_modules/font-awesome/*.{txt,json,md}'
  ])
  .pipe(gulp.dest('./vendor/font-awesome'));

  // jQuery
  gulp.src([
    './node_modules/jquery/dist/*',
    '!./node_modules/jquery/dist/core.js'
  ])
  .pipe(gulp.dest('./vendor/jquery'));

  // jQuery Easing
  gulp.src([
    './node_modules/jquery.easing/*.js'
  ])
  .pipe(gulp.dest('./vendor/jquery-easing'));

  // Simple Line Icons
  gulp.src([
    './node_modules/simple-line-icons/fonts/**',
  ])
  .pipe(gulp.dest('./vendor/simple-line-icons/fonts'));

  gulp.src([
    './node_modules/simple-line-icons/css/**',
  ])
  .pipe(gulp.dest('./vendor/simple-line-icons/css'));

  return Promise.resolve();
}

// Compile SCSS
function compileSass() {
  return gulp.src('./scss/**/*.scss')
    .pipe(sass.sync({
      outputStyle: 'expanded'
    }).on('error', sass.logError))
    .pipe(gulp.dest('./css'));
}

// Minify CSS
function minifyCSS() {
  return gulp.src([
    './css/*.css',
    '!./css/*.min.css'
  ])
  .pipe(cleanCSS())
  .pipe(rename({
    suffix: '.min'
  }))
  .pipe(gulp.dest('./css'))
  .pipe(browserSync.stream());
}

// Minify JavaScript
function minifyJS() {
  return gulp.src([
    './js/*.js',
    '!./js/*.min.js'
  ])
  .pipe(uglify())
  .pipe(rename({
    suffix: '.min'
  }))
  .pipe(gulp.dest('./js'))
  .pipe(browserSync.stream());
}

// Configure the browserSync task
function serve() {
  browserSync.init({
    server: {
      baseDir: "./"
    }
  });
}

// Watch files
function watchFiles() {
  gulp.watch('./scss/*.scss', gulp.series(compileSass, minifyCSS));
  gulp.watch('./js/*.js', minifyJS);
  gulp.watch('./*.html').on('change', browserSync.reload);
}

// Define complex tasks
const css = gulp.series(compileSass, minifyCSS);
const build = gulp.parallel(css, minifyJS, vendor);
const dev = gulp.series(build, gulp.parallel(watchFiles, serve));

// Export tasks
exports.css = css;
exports.js = minifyJS;
exports.vendor = vendor;
exports.build = build;
exports.default = build;
exports.dev = dev;
