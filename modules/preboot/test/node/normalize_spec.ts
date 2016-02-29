import {normalize, normalizers, defaultFreezeStyles} from '../../src/node/normalize';

describe('normalize', function () {

  describe('pauseEvent()', function () {
    it('should verify default', function () {
      let opts = { pauseEvent: '' };
      normalizers.pauseEvent(opts);
      expect(opts.pauseEvent).toBe('PrebootPause');
    });

    it('should set value', function () {
      let opts = { pauseEvent: 'BlahEvt' };
      normalizers.pauseEvent(opts);
      expect(opts.pauseEvent).toBe('BlahEvt');
    });
  });

  describe('resumeEvent()', function () {
    it('should verify default', function () {
      let opts = { resumeEvent: '' };
      normalizers.resumeEvent(opts);
      expect(opts.resumeEvent).toBe('PrebootResume');
    });

    it('should set value', function () {
      let opts = { resumeEvent: 'foo' };
      normalizers.resumeEvent(opts);
      expect(opts.resumeEvent).toBe('foo');
    });
  });

  describe('listen()', function () {
    it('should verify default', function () {
      let opts = { listen: null };
      normalizers.listen(opts);
      expect(opts.listen).toEqual([]);
    });

    it('should throw an error if string not valid listen strategy', function () {
      let opts = { listen: 'blah' };
      let fn = () => normalizers.listen(opts);
      expect(fn).toThrowError('Invalid listen strategy: blah');
    });

    it('should convert string to array', function () {
      let opts = { listen: 'event_bindings' };
      normalizers.listen(opts);
      expect(opts.listen).toEqual([{ name: 'event_bindings' }]);
    });

    it('should throw error if no name or getNodeEvents', function () {
      let listen = { foo: 'zoo' };
      let opts = { listen: listen };
      let fn = () => normalizers.listen(opts);
      expect(fn).toThrowError('Every listen strategy must either have a valid name or implement getNodeEvents()');
    });

    /* tslint:disable:no-empty */
    it('should convert object to array with getNodeEvents impl', function () {
      let listen = { foo: 'blue', getNodeEvents: function () {} };
      let opts = { listen: listen };
      normalizers.listen(opts);
      expect(opts.listen).toEqual([listen]);
    });

    it('should throw error if invalid name', function () {
      let listen = [{ name: 'asdfsd', foo: 'shoo' }];
      let opts = { listen: listen };
      let fn = () => normalizers.listen(opts);
      expect(fn).toThrowError('Invalid listen strategy: ' + 'asdfsd');
    });

    it('should use array if valid', function () {
      let listen = [
          { name: 'event_bindings', foo: 'shoo' },
          { getNodeEvents: function () {}, foo: 'sdfsd' }
      ];
      let opts = { listen: listen };
      normalizers.listen(opts);
      expect(opts.listen).toEqual(listen);
    });
  });

  describe('replay()', function () {
    it('should verify default', function () {
      let opts = { replay: null };
      normalizers.replay(opts);
      expect(opts.replay).toEqual([]);
    });

    it('should throw an error if string not valid replay strategy', function () {
      let opts = { replay: 'blah' };
      let fn = () => normalizers.replay(opts);
      expect(fn).toThrowError('Invalid replay strategy: blah');
    });

    it('should convert string to array', function () {
      let opts = { replay: 'rerender' };
      normalizers.replay(opts);
      expect(opts.replay).toEqual([{ name: 'rerender' }]);
    });

    it('should throw error if no name or replayEvents', function () {
      let replay = { foo: 'zoo' };
      let opts = { replay: replay };
      let fn = () => normalizers.replay(opts);
      expect(fn).toThrowError('Every replay strategy must either have a valid name or implement replayEvents()');
    });

    it('should convert object to array with replayEvents impl', function () {
      let replay = { foo: 'blue', replayEvents: function () {} };
      let opts = { replay: replay };
      normalizers.replay(opts);
      expect(opts.replay).toEqual([replay]);
    });

    it('should throw error if invalid name', function () {
      let replay = [{ name: 'asdfsd', foo: 'shoo' }];
      let opts = { replay: replay };
      let fn = () => normalizers.replay(opts);
      expect(fn).toThrowError('Invalid replay strategy: ' + 'asdfsd');
    });

    it('should use array if valid', function () {
      let replay = [
        { name: 'hydrate', foo: 'shoo' },
        { replayEvents: function () {}, foo: 'sdfsd' }
      ];
      let opts = { replay: replay };
      normalizers.replay(opts);
      expect(opts.replay).toEqual(replay);
    });
});

describe('freeze()', function () {
    it('should do nothing if no freeze option', function () {
      let opts = {};
      normalizers.freeze(opts);
      expect(opts).toEqual({});
    });

    it('should throw error if invalid freeze strategy', function () {
      let opts = { freeze: 'asdf' };
      let fn = () => normalizers.freeze(opts);
      expect(fn).toThrowError('Invalid freeze option: asdf');
    });

    it('should throw error if no string and no prep and cleanup', function () {
      let opts = { freeze: {} };
      let fn = () => normalizers.freeze(opts);
      expect(fn).toThrowError('Freeze must have name or prep and cleanup functions');
    });

    it('should have default styles if valid freeze', function () {
      let opts = { freeze: { name: 'spinner', styles: {} } };
      normalizers.freeze(opts);
      expect(opts.freeze.styles).toEqual(defaultFreezeStyles);
    });

    it('should override default styles', function () {
      let freezeStyleOverrides = {
        overlay: { className: 'foo' },
        spinner: { className: 'zoo' }
      };
      let opts = { freeze: { name: 'spinner', styles: freezeStyleOverrides } };
      normalizers.freeze(opts);
      expect(opts.freeze.styles.overlay.className).toEqual(freezeStyleOverrides.overlay.className);
      expect(opts.freeze.styles.spinner.className).toEqual(defaultFreezeStyles.spinner.className);
    });
  });

  describe('presets()', function () {
    it('should do nothing if no presets option', function () {
      let opts = {};
      normalizers.presets(opts);
      expect(opts).toEqual({});
    });

    it('should throw error if presets not an array', function () {
      let opts = { presets: 'asdf' };
      let fn = () => normalizers.presets(opts);
      expect(fn).toThrowError('presets must be an array of strings');
    });

    it('should throw error if presets not an array', function () {
      let opts = { presets: [{}] };
      let fn = () => normalizers.presets(opts);
      expect(fn).toThrowError('presets must be an array of strings');
    });

    it('should throw error if invalid preset value', function () {
      let opts = { presets: ['asdfsd'] };
      let fn = () => normalizers.presets(opts);
      expect(fn).toThrowError('Invalid preset: asdfsd');
    });
  });

  describe('normalize()', function () {
    it('should throw error if not listening for events', function () {
      let opts = {};
      let fn = () => normalize(opts);
      expect(fn).toThrowError('Not listening for any events. Preboot not going to do anything.');
    });
  });
});
