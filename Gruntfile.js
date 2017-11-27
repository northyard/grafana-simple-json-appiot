module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({

    clean: ["dist"],

    copy: {
      src_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['**/*', '!**/*.js', '!**/*.scss', '*.js'],
        dest: 'dist'
      },
      pluginDef: {
        expand: true,
        src: ['README.md'],
        dest: 'dist'
      },
      node_modules: {
        cwd: 'node_modules',
        expand: true,
        src: ['**/axios/dist/*'],
        dest: 'dist/node_modules'
      },
    
    },


    watch: {
      rebuild_all: {
        files: ['src/**/*'],
        tasks: ['default'],
        options: {spawn: false}
      }
    },    
   
  });

  grunt.registerTask('default', ['clean', 'copy:src_to_dist', 'copy:pluginDef', 'copy:node_modules']);
};
