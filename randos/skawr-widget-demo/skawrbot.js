/**
 * SkawrBot — Embeddable Q&A chat assistant widget.
 *
 * Merchants include this script on their site:
 *   <script src="http://localhost:8000/static/skawrbot.js"
 *           data-skawr-key="ska_..." async></script>
 *
 * Renders a floating chat bubble that opens a small panel. The panel shows a
 * greeting plus suggested questions, and POSTs shopper messages to the API,
 * rendering the static FAQ / product-search answers that come back.
 *
 * Zero dependencies. Vanilla JS. Never breaks the host site on failure.
 */
;(function () {
  'use strict'

  var API_BASE = 'http://localhost:8000'
  var PANEL_ID = 'skawrbot-panel'
  var BUBBLE_ID = 'skawrbot-bubble'
  var PRIMARY = '#ED7453'
  var FONT =
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // Find the script tag to get the API key.
  var scripts = document.querySelectorAll('script[data-skawr-key]')
  var scriptEl = scripts[scripts.length - 1]
  if (!scriptEl) return

  var apiKey = scriptEl.getAttribute('data-skawr-key')
  if (!apiKey) return

  // Avoid double init.
  if (document.getElementById(BUBBLE_ID)) return

  var config = {
    enabled: true,
    greeting: 'Hi. How can I help you today?',
    suggested_questions: [],
    theme_color: PRIMARY,
  }

  fetch(API_BASE + '/api/v1/skawrbot/config', {
    headers: { 'X-API-Key': apiKey },
  })
    .then(function (res) {
      if (!res.ok) return null
      return res.json()
    })
    .then(function (data) {
      if (data && data.enabled === false) return
      if (data) config = data
      init()
    })
    .catch(function () {
      // Silent failure — never break the host site.
    })

  function color() {
    return config.theme_color || PRIMARY
  }

  // Only allow http(s) / relative product URLs as a link target. A product
  // whose url is `javascript:...` (from a poisoned index) would otherwise run
  // script on click — stored XSS on the merchant storefront. Rejected → '#'.
  function safeUrl(value) {
    if (typeof value !== 'string' || !value) return '#'
    var v = value.trim()
    if (v.charAt(0) === '/') return v // root-relative
    try {
      var parsed = new URL(v, window.location.href)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? v : '#'
    } catch (e) {
      return '#'
    }
  }

  function init() {
    var bubble = document.createElement('button')
    bubble.id = BUBBLE_ID
    bubble.setAttribute('aria-label', 'Open chat')
    bubble.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:2147483000;width:56px;height:56px;' +
      'border-radius:50%;border:none;cursor:pointer;background:' +
      color() +
      ';box-shadow:0 6px 20px rgba(0,0,0,0.18);display:flex;align-items:center;' +
      'justify-content:center;transition:transform 0.15s ease;'
    bubble.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" ' +
      'xmlns="http://www.w3.org/2000/svg"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.2 1 ' +
      '4.2 2.6 5.7L4 21l3.9-1.3c1.3.5 2.7.7 4.1.7 5.5 0 10-3.9 10-8.7S17.5 3 12 3z" ' +
      'fill="white"/></svg>'
    bubble.onmouseenter = function () {
      bubble.style.transform = 'scale(1.05)'
    }
    bubble.onmouseleave = function () {
      bubble.style.transform = 'scale(1)'
    }
    bubble.onclick = togglePanel
    document.body.appendChild(bubble)
  }

  function togglePanel() {
    var existing = document.getElementById(PANEL_ID)
    if (existing) {
      existing.remove()
      return
    }
    renderPanel()
  }

  function renderPanel() {
    var panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.style.cssText =
      'position:fixed;bottom:88px;right:20px;z-index:2147483000;width:340px;' +
      'max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 120px);' +
      'background:#ffffff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.22);' +
      'display:flex;flex-direction:column;overflow:hidden;font-family:' +
      FONT +
      ';font-size:14px;color:#1A1410;'

    // Header
    var header = document.createElement('div')
    header.style.cssText =
      'padding:16px;background:' +
      color() +
      ';color:#ffffff;font-weight:600;font-size:15px;display:flex;' +
      'align-items:center;justify-content:space-between;'
    var title = document.createElement('span')
    title.textContent = 'Chat with us'
    header.appendChild(title)
    var close = document.createElement('button')
    close.innerHTML = '&times;'
    close.setAttribute('aria-label', 'Close chat')
    close.style.cssText =
      'background:none;border:none;color:#ffffff;font-size:22px;cursor:pointer;' +
      'line-height:1;opacity:0.85;padding:0 4px;'
    close.onclick = togglePanel
    header.appendChild(close)
    panel.appendChild(header)

    // Message log
    var log = document.createElement('div')
    log.id = 'skawrbot-log'
    log.style.cssText =
      'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#F4F4F5;'
    panel.appendChild(log)

    // Suggested questions
    if (config.suggested_questions && config.suggested_questions.length) {
      var chips = document.createElement('div')
      chips.style.cssText =
        'padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px;background:#F4F4F5;'
      config.suggested_questions.slice(0, 5).forEach(function (q) {
        var chip = document.createElement('button')
        chip.textContent = q
        chip.style.cssText =
          'border:1px solid rgba(237,116,83,0.4);background:#ffffff;color:' +
          color() +
          ';border-radius:16px;padding:6px 12px;font-size:12.5px;cursor:pointer;' +
          'font-family:' +
          FONT +
          ';'
        chip.onclick = function () {
          send(q)
        }
        chips.appendChild(chip)
      })
      panel.appendChild(chips)
    }

    // Input row
    var inputRow = document.createElement('div')
    inputRow.style.cssText =
      'display:flex;gap:8px;padding:12px;border-top:1px solid rgba(0,0,0,0.07);background:#ffffff;'
    var input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Type your question'
    input.style.cssText =
      'flex:1;border:1px solid rgba(0,0,0,0.12);border-radius:10px;padding:9px 12px;' +
      'font-size:14px;outline:none;font-family:' +
      FONT +
      ';'
    input.onkeydown = function (e) {
      if (e.key === 'Enter' && input.value.trim()) {
        var v = input.value.trim()
        input.value = ''
        send(v)
      }
    }
    var sendBtn = document.createElement('button')
    sendBtn.textContent = 'Send'
    sendBtn.style.cssText =
      'border:none;background:' +
      color() +
      ';color:#ffffff;border-radius:10px;padding:9px 16px;font-size:13px;' +
      'font-weight:600;cursor:pointer;font-family:' +
      FONT +
      ';'
    sendBtn.onclick = function () {
      if (input.value.trim()) {
        var v = input.value.trim()
        input.value = ''
        send(v)
      }
    }
    inputRow.appendChild(input)
    inputRow.appendChild(sendBtn)
    panel.appendChild(inputRow)

    document.body.appendChild(panel)

    // Greeting from the bot.
    addMessage(config.greeting || 'Hi. How can I help you today?', 'bot')
    input.focus()
  }

  function addMessage(text, who) {
    var log = document.getElementById('skawrbot-log')
    if (!log) return null
    var bubble = document.createElement('div')
    var isUser = who === 'user'
    bubble.style.cssText =
      'max-width:82%;padding:9px 13px;border-radius:14px;line-height:1.45;' +
      'white-space:pre-wrap;word-wrap:break-word;' +
      (isUser
        ? 'align-self:flex-end;background:' + color() + ';color:#ffffff;'
        : 'align-self:flex-start;background:#ffffff;color:#1A1410;border:1px solid rgba(0,0,0,0.07);')
    bubble.textContent = text
    log.appendChild(bubble)
    log.scrollTop = log.scrollHeight
    return bubble
  }

  function addProducts(products) {
    var log = document.getElementById('skawrbot-log')
    if (!log || !products || !products.length) return
    var wrap = document.createElement('div')
    wrap.style.cssText =
      'align-self:flex-start;max-width:90%;display:flex;flex-direction:column;gap:6px;'
    products.forEach(function (p) {
      if (!p || !p.title) return
      var row = document.createElement('a')
      row.href = safeUrl(p.url)
      row.target = '_blank'
      row.rel = 'noopener noreferrer'
      row.textContent = p.title
      row.style.cssText =
        'display:block;background:#ffffff;border:1px solid rgba(0,0,0,0.07);' +
        'border-radius:10px;padding:8px 12px;color:' +
        color() +
        ';text-decoration:none;font-size:13px;font-weight:500;'
      wrap.appendChild(row)
    })
    log.appendChild(wrap)
    log.scrollTop = log.scrollHeight
  }

  function send(text) {
    addMessage(text, 'user')
    var typing = addMessage('...', 'bot')

    fetch(API_BASE + '/api/v1/skawrbot/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ message: text }),
    })
      .then(function (res) {
        return res.ok ? res.json() : null
      })
      .then(function (data) {
        if (typing) typing.remove()
        if (!data) {
          addMessage(
            'Something went wrong. Please try again in a moment.',
            'bot'
          )
          return
        }
        addMessage(data.reply || data.answer || '', 'bot')
        if (data.products && data.products.length) {
          addProducts(data.products)
        }
      })
      .catch(function () {
        if (typing) typing.remove()
        addMessage('Something went wrong. Please try again in a moment.', 'bot')
      })
  }
})()
