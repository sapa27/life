// Thai Life Insurance Planning & Policy System
// GitHub Pages runtime configuration — MessagePort Bridge v2
(function installGasMessagePortAdapter_(){
  'use strict';
  const nativeGetById = document.getElementById.bind(document);
  const nativeAddEventListener = window.addEventListener.bind(window);
  let bridgePort = null;
  let bridgeProxy = null;
  let fakeWindow = null;

  function trustedGasOrigin(origin){
    try {
      const host = new URL(origin).hostname;
      return host === 'script.google.com' ||
             host === 'script.googleusercontent.com' ||
             host.endsWith('.script.googleusercontent.com');
    } catch (_) { return false; }
  }

  function getRealFrame(){ return nativeGetById('gasBridge'); }

  function dispatchBridgeMessage(data){
    try {
      const ev = new MessageEvent('message', {
        data,
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
      const real = getRealFrame();
      if (real && real.contentWindow) real.contentWindow.postMessage(packet, '*');
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

  document.getElementById = function(id){
    const real = nativeGetById(id);
    if (id !== 'gasBridge' || !real) return real;
    if (!bridgeProxy) bridgeProxy = makeBridgeProxy(real);
    return bridgeProxy;
  };

  // Bridge v2 sends LI_GAS_READY directly from the inner Apps Script sandbox
  // to the GitHub top window and transfers a MessagePort. The adapter turns
  // that direct channel into the legacy iframe.contentWindow interface used by
  // app.js, so the application/business code does not need to be duplicated.
  nativeAddEventListener('message', function(ev){
    const m = ev.data || {};
    if (m.type !== 'LI_GAS_READY' || !m.bridgeNonce) return;
    const port = ev.ports && ev.ports[0];
    if (!port || !trustedGasOrigin(ev.origin)) return;
    if (m.allowedOrigin && m.allowedOrigin !== '*' && m.allowedOrigin !== location.origin) {
      dispatchBridgeMessage({
        type: 'LI_GAS_ORIGIN_REJECTED',
        receivedOrigin: location.origin,
        allowedOrigin: m.allowedOrigin,
        version: m.version || ''
      });
      return;
    }
    bridgePort = port;
    bridgePort.onmessage = function(e){ dispatchBridgeMessage(e.data || {}); };
    if (bridgePort.start) bridgePort.start();
    dispatchBridgeMessage(m);
  }, true);
})();

window.LIFE_APP_CONFIG = Object.freeze({
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxWgwgIlAKbkF9raEX566-Pp9iCQGUKiDJk7yXmcSrJXcXSoRkIcWKpAnCDhKME8udm/exec',
  BRIDGE_TIMEOUT_MS: 30000,
  REQUEST_TIMEOUT_MS: 90000,
  BUILD_ID: '20260817-message-port-v2',
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
