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

/**
 * Directory containing generated sources which still contain
 * JSDOC etc.
 */
var genDir = 'gen'
var srcDir = 'src'
var testDir = 'test'

gulp.task('watch', function () {
  gulp.watch([srcDir + '/**/*.js', testDir + '/**/*.js', srcDir + '/**/*.ts', 'gulpfile.js'],
    ['tsc', 'babel', 'test', 'standard'])
})

const babel = require('gulp-babel')

/**
 * compile tsc (including srcmaps)
 * @input srcDir
 * @output genDir
 */
gulp.task('tsc', function () {
  var tsProject = ts.createProject('tsconfig.json', { inlineSourceMap: false })
  var tsResult = tsProject.src() // gulp.src('lib/*.ts')
    .pipe(sourcemaps.init()) // This means sourcemaps will be generated
    .pipe(tsProject())

    // ts({
    // ...
    // }))

  return tsResult.js
    .pipe(babel({
      comments: true,
      presets: ['es2015']
    }))
    // .pipe( ... ) // You can use other plugins that also support gulp-sourcemaps
    .pipe(sourcemaps.write()) // Now the sourcemaps are added to the .js file
    .pipe(gulp.dest('gen'))
})

var jsdoc = require('gulp-jsdoc3')

gulp.task('doc', function (cb) {
  gulp.src([srcDir + '/**/*.js', 'README.md', './gen/**/*.js'], {read: false})
    .pipe(jsdoc(cb))
})

var instrument = require('gulp-instrument')

gulp.task('instrument', function () {
  return gulp.src([genDir + '/**/*.js'])
    .pipe(instrument())
    .pipe(gulp.dest('gen_cov'))
})

var newer = require('gulp-newer')

var imgSrc = 'src/**/*.js'
var imgDest = 'gen'

// compile standard sources with babel,
// as the coverage input requires this
//
gulp.task('babel', function () {
  // Add the newer pipe to pass through newer images only
  return gulp.src([imgSrc, 'gen_tsc/**/*.js'])
    .pipe(newer(imgDest))
    .pipe(babel({
      comments: true,
      presets: ['es2015']
    }))
    .pipe(gulp.dest('gen'))
})

var nodeunit = require('gulp-nodeunit')
var env = require('gulp-env')

/**
 * This does not work, as we are somehow unable to
 * redirect the lvoc reporter output to a file
 */
gulp.task('testcov', function () {
  const envs = env.set({
    DO_COVERAGE: '1'
  })
  gulp.src(['./**/covleven.js'])
    .pipe(envs)
    .pipe(nodeunit({
      reporter: 'lcov',
      reporterOptions: {
        output: 'testcov'
      }
    })).pipe(gulp.dest('./cov/lcov.info'))
})

gulp.task('test', function () {
  gulp.src(['test/**/*.js'])
    .pipe(nodeunit({
      // reporter: 'lcov',
      // reporterOptions: {
      //  output: 'testcov'
      // }
    })).pipe(gulp.dest('./out/lcov.info'))
})
//    .pipe(gulp.dest('./cov')) // default file name: src-cov.js
// })

// shoudl be replaced by ESLINT and a typescript output
// compliant config

var standard = require('gulp-standard')

gulp.task('standard', function () {
  return gulp.src(['src/**/*.js', 'test/**/*.js', 'gulpfile.js'])
    .pipe(standard())
    .pipe(standard.reporter('default', {
      breakOnError: true,
      quiet: true
    }))
})

var coveralls = require('gulp-coveralls')

gulp.task('coveralls', function () {
  gulp.src('testcov/**/lcov.info')
    .pipe(coveralls())
})

// Default Task
gulp.task('coverage', ['tsc', 'babel', 'standard', 'instrument', 'doc', 'coveralls'])

// Default Task
gulp.task('default', ['tsc', 'babel', 'standard', 'instrument', 'doc'])