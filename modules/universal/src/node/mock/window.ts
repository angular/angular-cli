import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {provide} from 'angular2/core';

// the overloaded "window" must extend node's "global"
// see: https://github.com/angular/angular/blob/master/modules/angular2/src/facade/lang.ts#L38
var win = Object.create(global);

/**
 * Warn the developer about direct access to Window props
 * @param  {String} prop The property being accessed
 */
function beDefensive(prop){
 return (<any>win).__defineGetter__(prop, () => {
   console.warn(`[WARNING] Property/method "${prop}" should not be called directly. Use DomAdapter instead.`);

  //  TODO(wassim): find a generic solution to proxify DomAdapter
  //  let doc = DOM.defaultDoc();
  //  return DOM.querySelector(doc, ...args);
   return prop;
 });
}

let unforgeableAttributes = [
  "window",
  "document",
  "location",
  "top"
].map(beDefensive);

let replaceableAttributes = [
  "self",
  "locationbar",
  "menubar",
  "personalbar",
  "scrollbars",
  "statusbar",
  "toolbar",
  "frames",
  "parent",
  "external",
  "length",

  // CSSOM-View
  "screen",
  "scrollX",
  "scrollY",
  "pageXOffset",
  "pageYOffset",
  "innerWidth",
  "innerHeight",
  "screenX",
  "screenY",
  "outerWidth",
  "outerHeight",
  "devicePixelRatio",
].map(beDefensive);

let methods = [
  "close",
  "stop",
  "focus",
  "blur",
  "open",
  "alert",
  "confirm",
  "prompt",
  "print",
  "postMessage",

  // WindowBase64
  "btoa",
  "atob",

  // WindowTimers
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",

  // HTML Editing APIs
  "getSelection",

  // CSSOM
  "getComputedStyle",

  // CSSOM-View
  "matchMedia",
  "scroll",
  "scrollTo",
  "scrollBy"
].map(beDefensive);

let readonlyAttributes = [
  "history",
  "frameElement",
  "navigator",
  "applicationCache",

  // WindowSessionStorage
  "sessionStorage",

  // WindowLocalStorage
  "localStorage",
].map(beDefensive);

let writableAttributes = [
  "name",
  "status",
  "opener",
  "onabort",
  "onafterprint",
  "onbeforeprint",
  "onbeforeunload",
  "onblur",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "onclose",
  "oncontextmenu",
  "oncuechange",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onfocus",
  "onhashchange",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onmessage",
  "onmousedown",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onmousewheel",
  "onoffline",
  "ononline",
  "onpause",
  "onplay",
  "onplaying",
  "onpagehide",
  "onpageshow",
  "onpopstate",
  "onprogress",
  "onratechange",
  "onreset",
  "onresize",
  "onscroll",
  "onseeked",
  "onseeking",
  "onselect",
  "onshow",
  "onstalled",
  "onstorage",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "onunload",
  "onvolumechange",
  "onwaiting"
].map(beDefensive);


(<any>global).window = win;

export var window = win;
