import {PrebootOptions} from '../interfaces/preboot_options';

export default {

  /**
   * Record key strokes in all textboxes and textareas as well as changes
   * in other form elements like checkboxes, radio buttons and select dropdowns
   */
  keyPress: (opts: PrebootOptions) => {
    opts.listen = opts.listen || [];
    opts.listen.push({
      name: 'selectors',
      eventsBySelector: {
        'input,textarea': ['keypress', 'keyup', 'keydown', 'input', 'change']
      }
    });
    opts.listen.push({
      name: 'selectors',
      eventsBySelector: {
        'select,option': ['change']
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
        'input,textarea': ['focusin', 'focusout', 'mousedown', 'mouseup']
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
        'input': ['focus'],
        'textarea': ['focus']
      },
      doNotReplay: true,
      dispatchEvent: opts.pauseEvent
    });

    opts.listen.push({
      name: 'selectors',
      eventsBySelector: {
        'input': ['blur'],
        'textarea': ['blur']
      },
      doNotReplay: true,
      dispatchEvent: opts.resumeEvent
    });
  }
};
