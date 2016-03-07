import {selectorResolver} from './helper';
import * as _preboot from 'preboot';

export var preboot = _preboot;

export function prebootConfigDefault(config = {}) {
  return (<any>Object).assign({
    start:    true,
    appRoot:  'app',         // selector for root element
    replay:   'rerender',    // rerender replay strategy
    buffer:   true,          // client app will write to hidden div until bootstrap complete
    debug:    false,
    uglify:   true,
    presets:  ['keyPress', 'buttonPress', 'focus']
  }, config || {});
}

export function createPrebootCode(componentType: any | Array<any>, prebootConfig: any = {}): Promise<string> {
  if (!prebootConfig) { return Promise.resolve(''); }
  if (typeof prebootConfig === 'boolean') { prebootConfig = {}; }

  let selector = null;
  if (!Array.isArray(componentType)) {
    selector = selectorResolver(componentType);
  } else {
    selector = componentType.map(selectorResolver)[0]; // hard code last app
  }
  // Get selector from Component selector metadata
  prebootConfig.appRoot = prebootConfig.appRoot || selector;

  let config = prebootConfigDefault(prebootConfig);
  return preboot.getBrowserCode(config).then(code => createPrebootHTML(code, config));
}

export function getPrebootCSS(min?: boolean): string {
  if (min) {
    /* tslint:disable */
    // https://cssminifier.com/
    return `.preboot-overlay{background:grey;opacity:.27}@keyframes spin{to{transform:rotate(1turn)}}.preboot-spinner{position:relative;display:inline-block;width:5em;height:5em;margin:0 .5em;font-size:12px;text-indent:999em;overflow:hidden;animation:spin 1s infinite steps(8)}.preboot-spinner.small{font-size:6px}.preboot-spinner.large{font-size:24px}.preboot-spinner:after,.preboot-spinner:before,.preboot-spinner>div:after,.preboot-spinner>div:before{content:'';position:absolute;top:0;left:2.25em;width:.5em;height:1.5em;border-radius:.2em;box-shadow:0 3.5em #eee;transform-origin:50% 2.5em}.preboot-spinner:before{background:#555}.preboot-spinner:after{transform:rotate(-45deg);background:#777}.preboot-spinner>div:before{transform:rotate(-90deg);background:#999}.preboot-spinner>div:after{transform:rotate(-135deg);background:#bbb}`;
    /* tslint:enable */
  }
  return `
.preboot-overlay {
  background: grey;
  opacity: .27;
}

@keyframes spin {
  to { transform: rotate(1turn); }
}

.preboot-spinner {
  position: relative;
  display: inline-block;
  width: 5em;
  height: 5em;
  margin: 0 .5em;
  font-size: 12px;
  text-indent: 999em;
  overflow: hidden;
  animation: spin 1s infinite steps(8);
}

.preboot-spinner.small {
  font-size: 6px;
}

.preboot-spinner.large {
  font-size: 24px;
}

.preboot-spinner:before,
.preboot-spinner:after,
.preboot-spinner > div:before,
.preboot-spinner > div:after {
  content: '';
  position: absolute;
  top: 0;
  left: 2.25em; /* (container width - part width)/2  */
  width: .5em;
  height: 1.5em;
  border-radius: .2em;
  background: #eee;
  box-shadow: 0 3.5em #eee; /* container height - part height */
  transform-origin: 50% 2.5em; /* container height / 2 */
}

.preboot-spinner:before {
  background: #555;
}

.preboot-spinner:after {
  transform: rotate(-45deg);
  background: #777;
}

.preboot-spinner > div:before {
  transform: rotate(-90deg);
  background: #999;
}

.preboot-spinner > div:after {
  transform: rotate(-135deg);
  background: #bbb;
}
`;
}


export function createPrebootHTML(code: string, config?: any): string {
  let html = '';

  html += `
    <style>
    ${ getPrebootCSS(config && config.uglify) }
    </style>
  `;

  html += `
    <script>
    ${ code }
    </script>
  `;

  if (config && config.start === true) {
    html += '<script>\npreboot.start();\n</script>';
  }

  return html;
}
