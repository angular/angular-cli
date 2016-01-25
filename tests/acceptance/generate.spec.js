'use strict';

var ng     = require('../helpers/ng');
var expect    = require('chai').expect;
var Blueprint = require('ember-cli/lib/models/blueprint');
var path      = require('path');
var tmp       = require('../helpers/tmp');
var root      = process.cwd();
var conf      = require('ember-cli/tests/helpers/conf');
var forEach   = require('lodash/collection/forEach');
var existsSync = require('exists-sync');

var defaultIgnoredFiles = Blueprint.ignoredFiles;

describe('Acceptance: ng generate', function() {
    this.timeout(20000);

    before(function() {
        conf.setup();
    });

    after(function() {
        conf.restore();
    });

    beforeEach(function() {
        Blueprint.ignoredFiles = defaultIgnoredFiles;

        return tmp.setup('./tmp')
            .then(function() {
                process.chdir('./tmp');
            }).then(function() {
                return ng([
                    'new',
                    'foo',
                    '--skip-npm',
                    '--skip-bower',
                    '--skip-git'
                ]);
            });
    });

    afterEach(function() {
        return tmp.teardown('./tmp');
    });
    
    function confirmBlueprinted(files) {
        forEach(files, function(file) {
            expect(existsSync(file));
        });
    }
    
    function confirmBlueprintedComponent(settings) {
        settings = settings || {
            style: 'css'
        };
        
        var componentPath = path.join(process.cwd(), 'src/app/components/bar');
        
        var files = [
            path.join(componentPath, 'bar.' + settings.style),
            path.join(componentPath, 'bar.html'),
            path.join(componentPath, 'bar.ts'),
            path.join(componentPath, 'bar.spec.ts') 
        ];
        
        confirmBlueprinted(files);
    }
    
    function confirmBlueprintedService() {
        process.chdir('./src/app/services/bar');
        
        var servicePath = path.join(process.cwd(), 'src/app/services/bar');
        
        var files = [
            path.join(servicePath, 'bar.ts'),
            path.join(servicePath, 'bar.spec.ts')
        ];
        
        confirmBlueprinted(files);
    }

    it('component', function() {
        return ng([
            'generate',
            'component',
            'bar'
        ]).then(confirmBlueprintedComponent());
    });
    
    it('component with less', function() {
        return ng([
            'generate',
            'component',
            'bar',
            '--style=less'
        ]).then(confirmBlueprintedComponent({style: 'less'}));
    });

    it('services', function() {
        return ng([
            'generate',
            'service',
            'bar'
        ]).then(confirmBlueprintedService);
    });

});
