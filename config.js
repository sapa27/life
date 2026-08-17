// Thai Life Insurance Planning & Policy System
// GitHub Pages runtime configuration — GAS Bridge compatibility v3
(function installGasBridgeCompatibilityV3_(){
  'use strict';

  const nativeGetById = document.getElementById.bind(document);
  const nativeAddEventListener = window.addEventListener.bind(window);
  let bridgePort = null;
  let bridgeSource = null;
  let bridgeProxy = null;
  let fakeWindow = null;

  function trustedGasOrigin(origin){
    try {
      const host = new URL(origin).hostname.toLowerCase();
      return host === 'script.google.com' ||
             host === 'script.googleusercontent.com' ||
             host.endsWith('-script.googleusercontent.com') ||
             host.endsWith('.script.googleusercontent.com');
    } catch (_) {
      return false;
    }
  }

  function getRealFrame(){
    return nativeGetById('gasBridge');
  }

  function dispatchBridgeMessage(data){
    try {
      const ev = new MessageEvent('message', {
        data: data || {},
        origin: 'https://script.googleusercontent.com',
        source: fakeWindow
      });
      window.dispatchEvent(ev);
    } catch (_) {}
  }

  fakeWindow = {
    postMessage(packet){
      if (bridgePort) {
        bridgePort.postMessage(packet);
        return;
      }
      if (bridgeSource && typeof bridgeSource.postMessage === 'function') {
        bridgeSource.postMessage(packet, '*');
        return;
      }
      const real = getRealFrame();
      if (real && real.contentWindow) {
        real.contentWindow.postMessage(packet, '*');
      }
    }
  };

  function makeBridgeProxy(real){
    if (!real) return real;
    return new Proxy(real, {
      get(target, prop){
        if (prop === 'contentWindow') return fakeWindow;
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, prop, value){
        Reflect.set(target, prop, value, target);
        return true;
      }
    });
  }

  // Keep legacy app.js unchanged. Whenever it asks for #gasBridge, expose a
  // proxy whose contentWindow is the real inner GAS source/MessagePort channel.
  document.getElementById = function(id){
    const real = nativeGetById(id);
    if (id !== 'gasBridge' || !real) return real;
    if (!bridgeProxy) bridgeProxy = makeBridgeProxy(real);
    return bridgeProxy;
  };

  nativeAddEventListener('message', function(ev){
    // Ignore synthetic messages created below; they are for app.js only.
    if (ev.source === fakeWindow) return;

    const m = ev.data || {};
    if (!/^LI_GAS_/.test(String(m.type || ''))) return;
    if (!trustedGasOrigin(ev.origin)) return;

    bridgeSource = ev.source || bridgeSource;

    if (m.type === 'LI_GAS_READY' && m.bridgeNonce) {
      const port = ev.ports && ev.ports[0];
      if (port) {
        bridgePort = port;
        bridgePort.onmessage = function(e){
          dispatchBridgeMessage(e.data || {});
        };
        if (bridgePort.start) bridgePort.start();
      }

      if (m.allowedOrigin && m.allowedOrigin !== '*' && m.allowedOrigin !== location.origin) {
        dispatchBridgeMessage({
          type: 'LI_GAS_ORIGIN_REJECTED',
          receivedOrigin: location.origin,
          allowedOrigin: m.allowedOrigin,
          version: m.version || ''
        });
        return;
      }
    }

    // Forward READY, RESPONSE and diagnostics to legacy app.js using the
    // synthetic iframe WindowProxy that app.js expects.
    dispatchBridgeMessage(m);
  }, true);
})();

window.LIFE_APP_CONFIG = Object.freeze({
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxWgwgIlAKbkF9raEX566-Pp9iCQGUKiDJk7yXmcSrJXcXSoRkIcWKpAnCDhKME8udm/exec',
  BRIDGE_TIMEOUT_MS: 30000,
  REQUEST_TIMEOUT_MS: 90000,
  BUILD_ID: '20260817-gas-bridge-compat-v3',
  BRAND: Object.freeze({
    COMPANY_NAME: 'บริษัท ชับบ์ ไลฟ์ แอสชัวรันซ์ จำกัด (มหาชน)',
    DISPLAY_NAME: 'Chubb Life Thailand',
    P0D_PROPOSAL_MODE: 'REFERENCE_SAFE',
    BRAND_AUTHORIZED: false,
    OFFICIAL_LOGO_URL: 'https://news.chubb.com/download/CHUBB_Logo_Black_RBG.png',
    OFFICIAL_LOGO_ASSET_PAGE: 'https://news.chubb.com/logos',
    LOGO_USAGE_GUIDE: 'https://news.chubb.com/usage-guide',
    TRADEMARK_ATTRIBUTION: 'The Chubb logo is a registered trademark of Chubb Limited.'
  })
});
