/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// TODO: change the file to TypeScript and build soley using Bazel.

import { ApplicationRef, PlatformRef, ɵresetCompiledComponents } from '@angular/core';
import { filter, take } from 'rxjs/operators';

if (module['hot']) {
  module['hot'].accept();
  module['hot'].dispose(() => {
    if (typeof ng === 'undefined') {
      console.warn(`[NG HMR] Cannot find global 'ng'. Likely this is caused because scripts optimization is enabled.`);

      return;
    }

    if (!ng.getInjector) {
      // View Engine
      return;
    }

    // Reset JIT compiled components cache
    ɵresetCompiledComponents();
    const appRoot = getAppRoot();
    if (!appRoot) {
      return;
    }

    const appRef = getApplicationRef(appRoot);
    if (!appRef) {
      return;
    }

    const oldInputs = document.querySelectorAll('input, textarea');
    const oldOptions = document.querySelectorAll('option');

    // Create new application
    appRef.components
      .forEach(cp => {
        const element = cp.location.nativeElement;
        const parentNode = element.parentNode;
        parentNode.insertBefore(
          document.createElement(element.tagName),
          element,
        );

        parentNode.removeChild(element);
      });

    // Destroy old application, injectors, <style..., etc..
    const platformRef = getPlatformRef(appRoot);
    if (platformRef) {
      platformRef.destroy();
    }

    // Restore all inputs and options
    const bodyElement = document.body;
    if ((oldInputs.length + oldOptions.length) === 0 || !bodyElement) {
      return;
    }

    // Use a `MutationObserver` to wait until the app-root element has been bootstrapped.
    // ie: when the ng-version attribute is added.
    new MutationObserver((_mutationsList, observer) => {
      observer.disconnect();

      const newAppRoot = getAppRoot();
      if (!newAppRoot) {
        return;
      }
      
      const newAppRef = getApplicationRef(newAppRoot);
      if (!newAppRef) {
        return;
      }

      // Wait until the application isStable to restore the form values
      newAppRef.isStable
        .pipe(
          filter(isStable => !!isStable),
          take(1),
        )
        .subscribe(() => restoreFormValues(oldInputs, oldOptions));
    })
    .observe(bodyElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['ng-version'],
    });
  });
}

function getAppRoot() {
  const appRoot = document.querySelector('[ng-version]');
  if (!appRoot) {
    console.warn('[NG HMR] Cannot find the application root component.');

    return undefined;
  }

  return appRoot;
}

function getToken(appRoot, token) {
  return typeof ng === 'object' && ng.getInjector(appRoot).get(token) || undefined;
}

function getApplicationRef(appRoot) {
  const appRef = getToken(appRoot, ApplicationRef);
  if (!appRef) {
    console.warn(`[NG HMR] Cannot get 'ApplicationRef'.`);

    return undefined;
  }

  return appRef;
}

function getPlatformRef(appRoot) {
  const platformRef = getToken(appRoot, PlatformRef);
  if (!platformRef) {
    console.warn(`[NG HMR] Cannot get 'PlatformRef'.`);

    return undefined;
  }

  return platformRef;
}

function dispatchEvents(element) {
  element.dispatchEvent(new Event('input', {
    bubbles: true,
    cancelable: true,
  }));

  element.blur();

  element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
}

function restoreFormValues(oldInputs, oldOptions) {
  // Restore input
  const newInputs = document.querySelectorAll('input, textarea');
  if (newInputs.length && newInputs.length === oldInputs.length) {
    console.log('[NG HMR] Restoring input/textarea values.');
    for (let index = 0; index < newInputs.length; index++) {
      const newElement = newInputs[index];
      const oldElement = oldInputs[index];

      switch (oldElement.type) {
        case 'button':
        case 'image':
        case 'submit':
        case 'reset':
          // These types don't need any value change.
          continue;
        case 'radio':
        case 'checkbox':
          newElement.checked = oldElement.checked;
          break;
        case 'color':
        case 'date':
        case 'datetime-local':
        case 'email':
        case 'file':
        case 'hidden':
        case 'image':
        case 'month':
        case 'number':
        case 'password':
        case 'radio':
        case 'range':
        case 'search':
        case 'tel':
        case 'text':
        case 'textarea':
        case 'time':
        case 'url':
        case 'week':
          newElement.value = oldElement.value;
          break;
        default:
          console.warn('[NG HMR] Unknown input type ' + oldElement.type + '.');
          continue;
      }

      dispatchEvents(newElement);
    }
  } else {
    console.warn('[NG HMR] Cannot restore input/textarea values.');
  }

  // Restore option
  const newOptions = document.querySelectorAll('option');
  if (newOptions.length && newOptions.length === oldOptions.length) {
    console.log('[NG HMR] Restoring selected options.');
    for (let index = 0; index < newOptions.length; index++) {
      const newElement = newOptions[index];
      newElement.selected = oldOptions[index].selected;

      dispatchEvents(newElement);
    }
  } else {
    console.warn('[NG HMR] Cannot restore selected options.');
  }
}
