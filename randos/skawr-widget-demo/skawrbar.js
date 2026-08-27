/**
 * Skawr Bar — Embeddable announcement bar widget.
 *
 * Merchants include this script on their site:
 *   <script src="http://localhost:8000/static/skawrbar.js"
 *           data-skawr-key="ska_..." async></script>
 *
 * The widget fetches the active bar config from the API and renders
 * a top-of-page announcement bar with customizable text, CTA, and colors.
 * Dismiss state persisted in localStorage so dismissed bars don't re-show.
 *
 * Zero dependencies, ~3KB minified.
 */
;(function () {
  'use strict'

  var API_BASE = 'http://localhost:8000'
  var STORAGE_PREFIX = 'skawrbar_dismissed_'
  var CONTAINER_ID = 'skawrbar-container'

  // Find the script tag to get the API key
  var scripts = document.querySelectorAll('script[data-skawr-key]')
  var scriptEl = scripts[scripts.length - 1]
  if (!scriptEl) return

  var apiKey = scriptEl.getAttribute('data-skawr-key')
  if (!apiKey) return

  // Check if already initialized
  if (document.getElementById(CONTAINER_ID)) return

  // Fetch active bar
  fetch(API_BASE + '/api/v1/skawrbar/active', {
    headers: { 'X-API-Key': apiKey },
  })
    .then(function (res) {
      if (!res.ok) return null
      return res.json()
    })
    .then(function (data) {
      if (!data || !data.bars || data.bars.length === 0) return
      renderBars(data.bars)
    })
    .catch(function () {
      // Silent failure — never break the host site
    })

  function renderBars(bars) {
    var container = document.createElement('div')
    container.id = CONTAINER_ID
    container.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'

    bars.forEach(function (bar) {
      // Check if dismissed
      if (isDismissed(bar.id)) return

      var el = createBar(bar)
      if (el) container.appendChild(el)
    })

    if (container.children.length > 0) {
      document.body.insertBefore(container, document.body.firstChild)
      // Push page content down
      document.body.style.marginTop = container.offsetHeight + 'px'
    }
  }

  function createBar(bar) {
    var bgColor = bar.bg_color || '#ED7453'
    var textColor = bar.text_color || '#ffffff'

    var wrapper = document.createElement('div')
    wrapper.style.cssText =
      'display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 16px;background:' +
      bgColor +
      ';color:' +
      textColor +
      ';font-size:14px;line-height:1.4;text-align:center;position:relative;'

    // Message text
    var msg = document.createElement('span')
    msg.textContent = bar.title || bar.body || ''
    msg.style.cssText = 'flex:1;'
    wrapper.appendChild(msg)

    // CTA button
    if (bar.cta_text && bar.cta_url) {
      var cta = document.createElement('a')
      cta.href = bar.cta_url
      cta.textContent = bar.cta_text
      cta.style.cssText =
        'display:inline-block;padding:5px 14px;border-radius:4px;background:rgba(255,255,255,0.2);color:' +
        textColor +
        ';text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;border:1px solid rgba(255,255,255,0.3);'
      wrapper.appendChild(cta)
    }

    // Dismiss button
    if (bar.dismissible !== false) {
      var dismiss = document.createElement('button')
      dismiss.innerHTML = '&times;'
      dismiss.style.cssText =
        'position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:' +
        textColor +
        ';font-size:20px;cursor:pointer;opacity:0.7;padding:4px 8px;line-height:1;'
      dismiss.onclick = function () {
        wrapper.remove()
        setDismissed(bar.id)
        // Recalculate margin
        var cont = document.getElementById(CONTAINER_ID)
        if (cont) {
          document.body.style.marginTop = cont.offsetHeight + 'px'
          if (cont.children.length === 0) {
            document.body.style.marginTop = ''
            cont.remove()
          }
        }
      }
      wrapper.appendChild(dismiss)
    }

    return wrapper
  }

  function isDismissed(barId) {
    try {
      return localStorage.getItem(STORAGE_PREFIX + barId) === '1'
    } catch (e) {
      return false
    }
  }

  function setDismissed(barId) {
    try {
      localStorage.setItem(STORAGE_PREFIX + barId, '1')
    } catch (e) {
      // ignore
    }
  }
})()
