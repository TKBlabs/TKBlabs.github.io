(function () {
  const links = Array.from(document.querySelectorAll('a[data-download-key]'));
  if (!links.length) {
    return;
  }

  const namespace = document.body.dataset.countNamespace || 'tkbtk-com-downloads';
  const apiBasePath =
    document.body.dataset.downloadCounterApi ||
    'https://tkbtk-download-counter.tkbtk.workers.dev/api/download-counter';
  const numberFormatter = new Intl.NumberFormat('ja-JP');

  function selectorsByKey(key) {
    return document.querySelectorAll('[data-download-count="' + key + '"]');
  }

  function renderCount(key, value) {
    selectorsByKey(key).forEach((el) => {
      el.textContent = '累計ダウンロード: ' + numberFormatter.format(value) + ' 回';
      el.dataset.ready = 'true';
    });
  }

  function renderUnavailable(key) {
    selectorsByKey(key).forEach((el) => {
      el.textContent = '累計ダウンロード: 取得できません';
      el.dataset.ready = 'false';
    });
  }

  async function requestCount(mode, key) {
    const endpoint = new URL(apiBasePath, window.location.origin);
    endpoint.searchParams.set('ns', namespace);
    endpoint.searchParams.set('app', key);

    const controller = new AbortController();
    const timeoutId = setTimeout(function () {
      controller.abort();
    }, 2500);

    let response;
    try {
      response = await fetch(endpoint.toString(), {
        method: mode === 'hit' ? 'POST' : 'GET',
        cache: 'no-store',
        keepalive: mode === 'hit',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error('Count API request failed');
    }

    const data = await response.json();
    if (!data || typeof data.value !== 'number') {
      throw new Error('Count API response did not include a numeric value');
    }

    return data.value;
  }

  async function requestCountWithRetry(mode, key, retries) {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await requestCount(mode, key);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Counter request failed');
  }

  function canInterceptClick(event) {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    );
  }

  const keys = Array.from(new Set(links.map((link) => link.dataset.downloadKey).filter(Boolean)));

  keys.forEach(async (key) => {
    try {
      const value = await requestCountWithRetry('get', key, 1);
      renderCount(key, value);
    } catch (_error) {
      renderUnavailable(key);
    }
  });

  links.forEach((link) => {
    const key = link.dataset.downloadKey;
    if (!key) {
      return;
    }

    link.addEventListener('click', async (event) => {
      if (!canInterceptClick(event)) {
        return;
      }

      event.preventDefault();
      const targetUrl = link.href;

      try {
        const value = await Promise.race([
          requestCountWithRetry('hit', key, 0),
          new Promise((_, reject) => {
            setTimeout(function () {
              reject(new Error('timeout'));
            }, 450);
          })
        ]);

        if (typeof value === 'number') {
          renderCount(key, value);
        }
      } catch (_error) {
        // Continue to download even if counting fails.
      }

      window.location.assign(targetUrl);
    });
  });
})();
