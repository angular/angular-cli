var normalize_1 = require('../../../dist/preboot/src/server/normalize');
describe('normalize', function () {
    describe('pauseEvent()', function () {
        it('should verify default', function () {
            var opts = { pauseEvent: '' };
            normalize_1.normalizers.pauseEvent(opts);
            expect(opts.pauseEvent).toBe('PrebootPause');
        });
        it('should set value', function () {
            var opts = { pauseEvent: 'BlahEvt' };
            normalize_1.normalizers.pauseEvent(opts);
            expect(opts.pauseEvent).toBe('BlahEvt');
        });
    });
    describe('resumeEvent()', function () {
        it('should verify default', function () {
            var opts = { resumeEvent: '' };
            normalize_1.normalizers.resumeEvent(opts);
            expect(opts.resumeEvent).toBe('PrebootResume');
        });
        it('should set value', function () {
            var opts = { resumeEvent: 'foo' };
            normalize_1.normalizers.resumeEvent(opts);
            expect(opts.resumeEvent).toBe('foo');
        });
    });
    describe('listen()', function () {
        it('should verify default', function () {
            var opts = { listen: null };
            normalize_1.normalizers.listen(opts);
            expect(opts.listen).toEqual([]);
        });
        it('should throw an error if string not valid listen strategy', function () {
            var opts = { listen: 'blah' };
            var fn = function () { return normalize_1.normalizers.listen(opts); };
            expect(fn).toThrowError('Invalid listen strategy: blah');
        });
        it('should convert string to array', function () {
            var opts = { listen: 'event_bindings' };
            normalize_1.normalizers.listen(opts);
            expect(opts.listen).toEqual([{ name: 'event_bindings' }]);
        });
        it('should throw error if no name or getNodeEvents', function () {
            var listen = { foo: 'zoo' };
            var opts = { listen: listen };
            var fn = function () { return normalize_1.normalizers.listen(opts); };
            expect(fn).toThrowError('Every listen strategy must either have a valid name or implement getNodeEvents()');
        });
        /* tslint:disable:no-empty */
        it('should convert object to array with getNodeEvents impl', function () {
            var listen = { foo: 'blue', getNodeEvents: function () { } };
            var opts = { listen: listen };
            normalize_1.normalizers.listen(opts);
            expect(opts.listen).toEqual([listen]);
        });
        it('should throw error if invalid name', function () {
            var listen = [{ name: 'asdfsd', foo: 'shoo' }];
            var opts = { listen: listen };
            var fn = function () { return normalize_1.normalizers.listen(opts); };
            expect(fn).toThrowError('Invalid listen strategy: ' + 'asdfsd');
        });
        it('should use array if valid', function () {
            var listen = [
                { name: 'event_bindings', foo: 'shoo' },
                { getNodeEvents: function () { }, foo: 'sdfsd' }
            ];
            var opts = { listen: listen };
            normalize_1.normalizers.listen(opts);
            expect(opts.listen).toEqual(listen);
        });
    });
    describe('replay()', function () {
        it('should verify default', function () {
            var opts = { replay: null };
            normalize_1.normalizers.replay(opts);
            expect(opts.replay).toEqual([]);
        });
        it('should throw an error if string not valid replay strategy', function () {
            var opts = { replay: 'blah' };
            var fn = function () { return normalize_1.normalizers.replay(opts); };
            expect(fn).toThrowError('Invalid replay strategy: blah');
        });
        it('should convert string to array', function () {
            var opts = { replay: 'rerender' };
            normalize_1.normalizers.replay(opts);
            expect(opts.replay).toEqual([{ name: 'rerender' }]);
        });
        it('should throw error if no name or replayEvents', function () {
            var replay = { foo: 'zoo' };
            var opts = { replay: replay };
            var fn = function () { return normalize_1.normalizers.replay(opts); };
            expect(fn).toThrowError('Every replay strategy must either have a valid name or implement replayEvents()');
        });
        it('should convert object to array with replayEvents impl', function () {
            var replay = { foo: 'blue', replayEvents: function () { } };
            var opts = { replay: replay };
            normalize_1.normalizers.replay(opts);
            expect(opts.replay).toEqual([replay]);
        });
        it('should throw error if invalid name', function () {
            var replay = [{ name: 'asdfsd', foo: 'shoo' }];
            var opts = { replay: replay };
            var fn = function () { return normalize_1.normalizers.replay(opts); };
            expect(fn).toThrowError('Invalid replay strategy: ' + 'asdfsd');
        });
        it('should use array if valid', function () {
            var replay = [
                { name: 'hydrate', foo: 'shoo' },
                { replayEvents: function () { }, foo: 'sdfsd' }
            ];
            var opts = { replay: replay };
            normalize_1.normalizers.replay(opts);
            expect(opts.replay).toEqual(replay);
        });
    });
    describe('freeze()', function () {
        it('should do nothing if no freeze option', function () {
            var opts = {};
            normalize_1.normalizers.freeze(opts);
            expect(opts).toEqual({});
        });
        it('should throw error if invalid freeze strategy', function () {
            var opts = { freeze: 'asdf' };
            var fn = function () { return normalize_1.normalizers.freeze(opts); };
            expect(fn).toThrowError('Invalid freeze option: asdf');
        });
        it('should throw error if no string and no prep and cleanup', function () {
            var opts = { freeze: {} };
            var fn = function () { return normalize_1.normalizers.freeze(opts); };
            expect(fn).toThrowError('Freeze must have name or prep and cleanup functions');
        });
        it('should have default styles if valid freeze', function () {
            var opts = { freeze: { name: 'spinner', styles: {} } };
            normalize_1.normalizers.freeze(opts);
            expect(opts.freeze.styles).toEqual(normalize_1.defaultFreezeStyles);
        });
        it('should override default styles', function () {
            var freezeStyleOverrides = {
                overlay: { className: 'foo' },
                spinner: { className: 'zoo' }
            };
            var opts = { freeze: { name: 'spinner', styles: freezeStyleOverrides } };
            normalize_1.normalizers.freeze(opts);
            expect(opts.freeze.styles.overlay.className).toEqual(freezeStyleOverrides.overlay.className);
            expect(opts.freeze.styles.spinner.className).toEqual(normalize_1.defaultFreezeStyles.spinner.className);
        });
    });
    describe('presets()', function () {
        it('should do nothing if no presets option', function () {
            var opts = {};
            normalize_1.normalizers.presets(opts);
            expect(opts).toEqual({});
        });
        it('should throw error if presets not an array', function () {
            var opts = { presets: 'asdf' };
            var fn = function () { return normalize_1.normalizers.presets(opts); };
            expect(fn).toThrowError('presets must be an array of strings');
        });
        it('should throw error if presets not an array', function () {
            var opts = { presets: [{}] };
            var fn = function () { return normalize_1.normalizers.presets(opts); };
            expect(fn).toThrowError('presets must be an array of strings');
        });
        it('should throw error if invalid preset value', function () {
            var opts = { presets: ['asdfsd'] };
            var fn = function () { return normalize_1.normalizers.presets(opts); };
            expect(fn).toThrowError('Invalid preset: asdfsd');
        });
    });
});
