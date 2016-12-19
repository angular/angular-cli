/*
 * THIS IS TEMPORARY TO PATCH 2.1.1+ Core bugs
 */

/* tslint:disable */
let __compiler__: any = require('@angular/compiler');
import { __platform_browser_private__ } from '@angular/platform-browser';
var __core_private__: any = require('@angular/core');
let patch: Boolean = false;

if (!__core_private__.hasOwnProperty('ViewUtils')) {
    patch = true;
    __core_private__.ViewUtils = __core_private__.view_utils;
}

if (!__compiler__.__compiler_private__) {
    patch = true;
    (__compiler__).__compiler_private__ = {
        SelectorMatcher: __compiler__.SelectorMatcher,
        CssSelector: __compiler__.CssSelector
    }
}

var __universal__: any = require('angular2-platform-node/__private_imports__');
if (patch) {
    __universal__.ViewUtils = __core_private__.view_utils;
    __universal__.CssSelector = __compiler__.CssSelector
    __universal__.SelectorMatcher = __compiler__.SelectorMatcher
}
