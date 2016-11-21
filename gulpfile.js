/*
var ts = require("gulp-typescript")

// according to https://www.npmjs.com/package/gulp-typescript
// not supported
var tsProject = ts.createProject('tsconfig.json', { inlineSourceMap : false })

*/
// gulp.task('scripts', function() {
//    var tsResult = tsProject.src() // gulp.src("lib/*  * / * .ts") // or tsProject.src()
//        .pipe(tsProject())
//
//    return tsResult.js.pipe(gulp.dest('release'))
// })
// *

var gulp = require('gulp')
var ts = require('gulp-typescript')

var sourcemaps = require('gulp-sourcemaps')
var tsProject = ts.createProject('tsconfig.json', { inlineSourceMap: false })

gulp.task('scripts', function () {
  var tsResult = tsProject.src() // gulp.src('lib/*.ts')
    .pipe(sourcemaps.init()) // This means sourcemaps will be generated
    .pipe(tsProject())
    // ts({
    // ...
    // }))

  return tsResult.js
    // .pipe( ... ) // You can use other plugins that also support gulp-sourcemaps
    .pipe(sourcemaps.write()) // Now the sourcemaps are added to the .js file
    .pipe(gulp.dest('release/js'))
})

var jsdoc = require('gulp-jsdoc3')

gulp.task('doc', function (cb) {
  gulp.src(['./src/**/*.js', 'README.md', './release/**/*.js'], {read: false})
    .pipe(jsdoc(cb))
})

var instrument = require('gulp-instrument')

gulp.task('instrument', function () {
  return gulp.src('./src/utils/dam*.js')
    .pipe(instrument())
    .pipe(gulp.dest('src-cov'))
})

var jscoverage = require('gulp-coverage')

gulp.task('jscoverage', function () {
  gulp.src(['./**/l*.js'])
    .pipe(jscoverage())
    .pipe(gulp.dest('./cov')) // default file name: src-cov.js
})

var nodeunit = require('gulp-nodeunit')

gulp.task('testcov', function () {
  gulp.src(['./**/covleven.js'])
    .pipe(nodeunit({
      reporter: 'lcov',
      reporterOptions: {
        output: 'testcov'
      }
    })).pipe(gulp.dest('./testcov/lco.info'))
})
//    .pipe(gulp.dest('./cov')) // default file name: src-cov.js
// })

// shoudl be replaced by ESLINT and a typescript output
// compliant config

var standard = require('gulp-standard')

gulp.task('standard', function () {
  return gulp.src(['./app.js'])
    .pipe(standard())
    .pipe(standard.reporter('default', {
      breakOnError: true,
      quiet: true
    }))
})

var coveralls = require('gulp-coveralls')

gulp.task('coveralls', function () {
  gulp.src('test/**/lcov.info')
    .pipe(coveralls())
})

// Default Task
gulp.task('default', ['scripts', 'standard', 'instrument', 'doc', 'watch', 'gulp'])
