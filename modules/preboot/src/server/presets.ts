import {PrebootOptions} from '../interfaces/preboot_options';

export default {

  /**
   * Record key strokes in all textboxes and textareas
   */
  keyPress: (opts: PrebootOptions) => {
    opts.listen = opts.listen || [];
    opts.listen.push({
      name: 'selectors',
      eventsBySelector: {
        'input[type="text"],textarea': ['keypress', 'keyup', 'keydown']
      }
    });
  },

  /**
   * For focus option, the idea is to track focusin and focusout
   */
  focus: (opts: PrebootOptions) => {
    opts.listen = opts.listen || [];
    opts.listen.push({
      name: 'selectors',
      eventsBySelector: {
        'input[type="text"],textarea': ['focusin', 'focusout', 'mousedown', 'mouseup']
      },
      trackFocus: true,
      doNotReplay: true
    });
  },

  /**
   * This option used for button press events
   */
  buttonPress: (opts: PrebootOptions) => {
    opts.listen = opts.listen || [];
    opts.listen.push({
      name: 'selectors',
      preventDefault: true,
      eventsBySelector: {
        'input[type="submit"],button': ['click']
      },
      dispatchEvent: opts.freeze && opts.freeze.eventName
    });
  },

  /**
   * This option will pause preboot and bootstrap processes
   * if focus on an input textbox or textarea
   */
  pauseOnTyping: (opts: PrebootOptions) => {
    opts.listen = opts.listen || [];
    opts.listen.push({
      name: 'selectors',
      eventsBySelector: {
        'input[type="text"]': ['focus'],
        'textarea': ['focus']
      },
      doNotReplay: true,
      dispatchEvent: opts.pauseEvent
    });

    opts.listen.push({
      name: 'selectors',
      eventsBySelector: {
        'input[type="text"]': ['blur'],
        'textarea': ['blur']
      },
      doNotReplay: true,
      dispatchEvent: opts.resumeEvent
    });
  }
};
