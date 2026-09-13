window.CX_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxWZLpE9APX0G9K1YPSFknwt_uHuuWaRQB96I28x3wlSTaAv6qb6vV6Go7iOyeeDWffTA/exec"
};

// Browser requests to Google Apps Script are routed through our same-origin
// Workspace proxy. This avoids cross-origin redirect/CORS failures while
// keeping the existing frontend API contract unchanged.
(() => {
  const appsScriptUrl = window.CX_CONFIG.APPS_SCRIPT_URL;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input && input.url;
    if (requestUrl === appsScriptUrl) {
      return nativeFetch('/api/workspace', {
        ...init,
        headers: {
          ...(init.headers || {}),
          'Content-Type': 'application/json'
        }
      });
    }
    return nativeFetch(input, init);
  };
})();
