module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-nodeunit')
  grunt.loadNpmTasks('grunt-standard')
  grunt.loadNpmTasks('grunt-tsc')

  grunt.initConfig({
    eslint: {
      files: ['*.js', 'test/**/*.js']
    },
    standard: {
      app: {
        src: ['dispatcher.js', 'test/**/*.js']
      }
    },
    tsc: {},
    watch: {
      files: ['src/**/*.tsc', '*.js', 'src/**/*.js', 'lib/**/*.js', 'test/**/*.js'],
      tasks: ['tsc', 'nodeunit', 'standard']
    },
    nodeunit: {
      all: ['test/**/*.nunit.js']
    // options: {
    //  reporter: 'junit',
    //  reporterOptionsX: {
    //    output: 'outputdir'
    //  }
    //  }
    }
  })

  // Default task.
  grunt.registerTask('default', ['nodeunit', 'standard'])
}
