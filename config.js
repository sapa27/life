// Thai Life Insurance Planning & Policy System
// GitHub Pages runtime configuration — Bridge compatibility recovery 2026-08-17
(function installGasBridgeCompatibility_(){
  'use strict';
  const trustedGasOrigins = new Set([
    'https://script.google.com',
    'https://script.googleusercontent.com'
  ]);
  const nativeAddEventListener = window.addEventListener.bind(window);

  // GAS HtmlService may deliver postMessage from its googleusercontent sandbox
  // rather than the outer iframe WindowProxy. app.js still validates the bridge
  // nonce for every response; this compatibility wrapper only normalizes source
  // for LI_GAS_* messages coming from trusted Google Apps Script origins.
  window.addEventListener = function(type, listener, options){
    if(type !== 'message' || typeof listener !== 'function'){
      return nativeAddEventListener(type, listener, options);
    }
    const wrapped = function(ev){
      try{
        const data = ev && ev.data || {};
        const gasMessage = /^LI_GAS_/.test(String(data.type || ''));
        if(gasMessage && trustedGasOrigins.has(String(ev.origin || ''))){
          const frame = document.getElementById('gasBridge');
          if(frame && ev.source !== frame.contentWindow){
            const normalized = Object.create(ev);
            Object.defineProperty(normalized, 'source', {
              configurable: true,
              enumerable: true,
              value: frame.contentWindow
            });
            return listener.call(this, normalized);
          }
        }
      }catch(_err){
        // Fall through to the untouched browser event.
      }
      return listener.call(this, ev);
    };
    return nativeAddEventListener(type, wrapped, options);
  };
})();

window.LIFE_APP_CONFIG = Object.freeze({
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwEkuaRFgwdPwiErMlK2MkmvIk4905jRuIIk9U8LAYhyh70PLLhAJ4svUh_Cm_6KUBm/exec',
  BRIDGE_TIMEOUT_MS: 30000,
  REQUEST_TIMEOUT_MS: 90000,
  BUILD_ID: '20260817-bridge-compat-1',
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
