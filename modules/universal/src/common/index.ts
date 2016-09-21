
// export function getDOM() {
//   return require('@angular/platform-browser').__platform_browser_private__.getDOM();
// }
declare var Zone: any;

export const zoneProps = new WeakMap();

export class ZoneStore {
  zone;
  constructor(props = Object.create(null)) {
    let store = new Map();
    try {
      Object.keys(props).forEach((prop) => {
        store.set(prop, props[prop]);
      });
    } catch (e) {
      console.log('e', e);
    }
    zoneProps.set(this, store);
    this.zone = Zone.current.fork({
      name: 'ZoneStore',
      properties: {'ZoneStore': this}
    });
  }
  clear() {
    zoneProps.get(this).clear();
  }

  setMap(obj) {
    const props = zoneProps.get(this);
    for (let prop of obj) {
      props.set(prop, obj);
    }
  }

  get(key) {
    const props = zoneProps.get(this);

    if (this.has(key)) {
      return props.get(key);
    }
    return null;
  }
  set(key, value) {
    const props = zoneProps.get(this);
    if (this.has(key)) {
      props.set(key, value);
      return this;
    }
    return null;
  }
  has(key) {
    const props = zoneProps.get(this);
    return props.has && props.has(key);
  }
}
