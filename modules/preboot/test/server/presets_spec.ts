/// <reference path="../../../../tsd_typings/tsd.d.ts"/>

import presetFns from '../../src/server/presets';

/**
 * These tests are pretty basic, but just have something in
 * place that we can expand in the future
 */
describe('presets', function () {

    describe('keyPress()', function () {
        it('should add listen selector', function () {
            let opts = { listen: [] };
            let expected = {
              listen: [
                {
                  name: 'selectors',
                  eventsBySelector: {
                    'input[type="text"],textarea': ['keypress', 'keyup', 'keydown']
                  }
                },
                {
                  name: 'selectors',
                  eventsBySelector: {
                    'input[type="checkbox"],input[type="radio"],select,option': ['change']
                  }
                }
              ]
            };
            presetFns.keyPress(opts);
            expect(opts).toEqual(expected);
        });
    });

    describe('focus()', function () {
        it('should add listen selector', function () {
            let opts = { listen: [] };
            let expected = {
                listen: [{
                    name: 'selectors',
                    eventsBySelector: {
                        'input[type="text"],textarea':   ['focusin', 'focusout', 'mousedown', 'mouseup']
                    },
                    trackFocus: true,
                    doNotReplay: true
                }]
            };
            presetFns.focus(opts);
            expect(opts).toEqual(expected);
        });
    });

    describe('buttonPress()', function () {
        it('should add listen selector', function () {
            let opts = { listen: [], freeze: { name: 'spinner', eventName: 'yoyo' } };
            let expected = {
                listen: [{
                    name: 'selectors',
                    preventDefault: true,
                    eventsBySelector: {
                        'input[type="submit"],button': ['click']
                    },
                    dispatchEvent: opts.freeze.eventName
                }],
                freeze: { name: 'spinner', eventName: 'yoyo' }
            };
            presetFns.buttonPress(opts);
            expect(opts).toEqual(expected);
        });
    });

    describe('pauseOnTyping()', function () {
        it('should add listen selector', function () {
            let opts = { listen: [], pauseEvent: 'foo', resumeEvent: 'choo' };
            let expected = {
                listen: [
                    {
                        name: 'selectors',
                        eventsBySelector: {
                            'input[type="text"]': ['focus'],
                            'textarea': ['focus']
                        },
                        doNotReplay: true,
                        dispatchEvent: opts.pauseEvent
                    },
                    {
                        name: 'selectors',
                        eventsBySelector: {
                            'input[type="text"]': ['blur'],
                            'textarea': ['blur']
                        },
                        doNotReplay: true,
                        dispatchEvent: opts.resumeEvent
                    }
                ],
                pauseEvent: opts.pauseEvent,
                resumeEvent: opts.resumeEvent
            };
            presetFns.pauseOnTyping(opts);
            expect(opts).toEqual(expected);
        });
    });

});
