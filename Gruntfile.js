module.exports = function(grunt) {
    'use strict';

    var srcDir = 'src';
    var outDir = 'lib';

    grunt.initConfig({
        ts: {
            options: {
                "declaration": true,
                "module": "commonjs",
                "noImplicitAny": false,
                "noLib": false,
                "outDir": "dist",
                "preserveConstEnums": true,
                "removeComments": true,
                "sourceMap": false,
                "target": "es5"
            },
            build: {
                src: ['src/**/*.ts'],
                outDir: 'dist',
                baseDir: 'src'
            },
        },
        jasmine_nodejs: {
            test: {
                specs: ['dist/specs/**']
            }
        }
    });

    // Load the tasks.
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-jasmine-nodejs');

    // Identify the targets.
    grunt.registerTask('default', ['ts:build']);
    grunt.registerTask('test', 'jasmine_nodejs');
};
