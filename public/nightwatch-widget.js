(function () {
  'use strict';

  var config = window.NightwatchConfig;
  if (!config) {
    console.error('NightwatchConfig not found');
    return;
  }

  var sessionId =
    sessionStorage.getItem('nw_session') || crypto.randomUUID();
  sessionStorage.setItem('nw_session', sessionId);

  var conversationHistory = [];
  var isOpen = false;
  var isWaiting = false;
  var hasGreeted = false;
  var leadCaptured = false;
  var previewTimeout = null;
  var previewDismissTimeout = null;

  // Restore conversation
  var saved = sessionStorage.getItem('nw_messages');
  if (saved) {
    try {
      conversationHistory = JSON.parse(saved);
      hasGreeted = true;
    } catch (e) {
      conversationHistory = [];
    }
  }

  // --- Inject CSS ---
  var style = document.createElement('style');
  style.textContent =
    '#nw-widget *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}' +

    // Button
    '#nw-btn{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;z-index:999998;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:transform 0.2s;}' +
    '#nw-btn:hover{transform:scale(1.08);}' +
    '#nw-btn svg{width:28px;height:28px;fill:#fff;}' +

    // Pulse ring
    '#nw-btn::before{content:"";position:absolute;width:100%;height:100%;border-radius:50%;animation:nw-pulse 2s ease-out infinite;pointer-events:none;}' +
    '@keyframes nw-pulse{0%{box-shadow:0 0 0 0 rgba(193,123,42,0.5);}70%{box-shadow:0 0 0 14px rgba(193,123,42,0);}100%{box-shadow:0 0 0 0 rgba(193,123,42,0);}}' +

    // Preview bubble
    '#nw-preview{position:fixed;bottom:96px;right:24px;max-width:260px;background:#1E1B16;color:#F2EDE4;padding:12px 16px;border-radius:12px 12px 2px 12px;font-size:13px;line-height:1.5;z-index:999997;box-shadow:0 8px 24px rgba(0,0,0,0.4);border:1px solid rgba(193,123,42,0.2);opacity:0;transform:translateY(8px);transition:opacity 0.3s,transform 0.3s;pointer-events:none;}' +
    '#nw-preview.nw-show{opacity:1;transform:translateY(0);pointer-events:auto;}' +
    '#nw-preview-close{position:absolute;top:4px;right:8px;background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:14px;line-height:1;}' +

    // Panel
    '#nw-panel{position:fixed;bottom:96px;right:24px;width:380px;height:520px;background:#0E0C0A;border:1px solid rgba(193,123,42,0.3);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);z-index:999999;display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(0.96);transition:opacity 0.3s,transform 0.3s;pointer-events:none;}' +
    '#nw-panel.nw-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}' +

    // Header
    '#nw-header{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid rgba(193,123,42,0.15);flex-shrink:0;}' +
    '#nw-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:15px;flex-shrink:0;}' +
    '#nw-header-info{margin-left:10px;flex:1;}' +
    '#nw-header-name{color:#fff;font-size:14px;font-weight:500;}' +
    '#nw-header-status{display:flex;align-items:center;gap:5px;margin-top:2px;}' +
    '#nw-status-dot{width:7px;height:7px;border-radius:50%;background:#4CAF50;animation:nw-dot-pulse 2s ease-in-out infinite;}' +
    '@keyframes nw-dot-pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}' +
    '#nw-header-status span{font-size:11px;color:#4CAF50;}' +
    '#nw-close{background:none;border:none;color:rgba(255,255,255,0.4);font-size:28px;cursor:pointer;line-height:1;padding:0 4px;transition:color 0.2s;}' +
    '#nw-close:hover{color:rgba(255,255,255,0.8);}' +

    // Messages
    '#nw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;}' +
    '#nw-messages::-webkit-scrollbar{width:4px;}' +
    '#nw-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}' +
    '.nw-msg{max-width:80%;padding:12px 16px;font-size:14px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap;}' +
    '.nw-msg-agent{align-self:flex-start;background:#1E1B16;color:#F2EDE4;border-radius:12px 12px 12px 2px;}' +
    '.nw-msg-user{align-self:flex-end;color:#fff;border-radius:12px 12px 2px 12px;}' +

    // Typing indicator
    '.nw-typing{align-self:flex-start;background:#1E1B16;border-radius:12px 12px 12px 2px;padding:12px 18px;display:flex;gap:5px;align-items:center;}' +
    '.nw-typing-dot{width:7px;height:7px;border-radius:50%;background:#F2EDE4;opacity:0.3;animation:nw-typing-anim 1.4s ease-in-out infinite;}' +
    '.nw-typing-dot:nth-child(2){animation-delay:0.2s;}' +
    '.nw-typing-dot:nth-child(3){animation-delay:0.4s;}' +
    '@keyframes nw-typing-anim{0%,60%,100%{opacity:0.3;transform:scale(1);}30%{opacity:1;transform:scale(1.2);}}' +

    // Lead success
    '.nw-success{align-self:center;text-align:center;padding:16px;color:#4CAF50;font-size:13px;line-height:1.5;}' +
    '.nw-checkmark{width:40px;height:40px;margin:0 auto 8px;border-radius:50%;background:rgba(76,175,80,0.15);display:flex;align-items:center;justify-content:center;animation:nw-check-pop 0.4s ease;}' +
    '.nw-checkmark svg{width:22px;height:22px;fill:#4CAF50;}' +
    '@keyframes nw-check-pop{0%{transform:scale(0);}60%{transform:scale(1.15);}100%{transform:scale(1);}}' +

    // Input area
    '#nw-input-area{padding:12px;border-top:1px solid rgba(193,123,42,0.15);background:#161410;display:flex;align-items:flex-end;gap:8px;flex-shrink:0;}' +
    '#nw-textarea{flex:1;background:transparent;border:none;outline:none;color:#F2EDE4;font-size:13px;line-height:1.5;resize:none;max-height:60px;font-family:inherit;}' +
    '#nw-textarea::placeholder{color:#5A554D;}' +
    '#nw-send{width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.2s;}' +
    '#nw-send:disabled{opacity:0.4;cursor:default;}' +
    '#nw-send svg{width:16px;height:16px;fill:#fff;}' +

    // Footer
    '#nw-footer{padding:6px;text-align:center;flex-shrink:0;}' +
    '#nw-footer a{font-size:10px;color:#3A3530;text-decoration:none;}' +
    '#nw-footer a:hover{color:#5A554D;}' +

    // Mobile
    '@media(max-width:480px){' +
      '#nw-panel{top:0;left:0;right:0;bottom:0;width:100%;height:100%;border-radius:0;border:none;}' +
    '}';
  document.head.appendChild(style);

  // --- Build DOM ---
  var widget = document.createElement('div');
  widget.id = 'nw-widget';

  // Preview bubble
  var preview = document.createElement('div');
  preview.id = 'nw-preview';
  preview.innerHTML =
    '<button id="nw-preview-close">&times;</button>' +
    '<span>' + escapeHtml(config.greeting) + '</span>';
  widget.appendChild(preview);

  // Chat button
  var btn = document.createElement('button');
  btn.id = 'nw-btn';
  btn.style.background = config.widgetColor;
  btn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  widget.appendChild(btn);

  // Chat panel
  var panel = document.createElement('div');
  panel.id = 'nw-panel';
  panel.innerHTML =
    // Header
    '<div id="nw-header">' +
      '<div id="nw-avatar" style="background:' + config.widgetColor + '">' + escapeHtml(config.agentName.charAt(0)) + '</div>' +
      '<div id="nw-header-info">' +
        '<div id="nw-header-name">' + escapeHtml(config.agentName) + '</div>' +
        '<div id="nw-header-status"><div id="nw-status-dot"></div><span>Online</span></div>' +
      '</div>' +
      '<button id="nw-close">&times;</button>' +
    '</div>' +
    // Messages
    '<div id="nw-messages"></div>' +
    // Input
    '<div id="nw-input-area">' +
      '<textarea id="nw-textarea" placeholder="Type your message..." rows="1"></textarea>' +
      '<button id="nw-send" style="background:' + config.widgetColor + '">' +
        '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
      '</button>' +
    '</div>' +
    // Footer
    '<div id="nw-footer"><a href="https://baratrust.com" target="_blank" rel="noopener">Powered by BaraTrust Nightwatch</a></div>';
  widget.appendChild(panel);
  document.body.appendChild(widget);

  // --- Element references ---
  var messagesEl = document.getElementById('nw-messages');
  var textarea = document.getElementById('nw-textarea');
  var sendBtn = document.getElementById('nw-send');
  var closeBtn = document.getElementById('nw-close');
  var previewCloseBtn = document.getElementById('nw-preview-close');

  // --- Restore saved messages to UI ---
  if (conversationHistory.length > 0) {
    for (var i = 0; i < conversationHistory.length; i++) {
      appendMessage(
        conversationHistory[i].role === 'user' ? 'user' : 'agent',
        conversationHistory[i].content,
        true
      );
    }
  }

  // --- Preview bubble (4s delay) ---
  previewTimeout = setTimeout(function () {
    if (!isOpen) {
      preview.classList.add('nw-show');
      previewDismissTimeout = setTimeout(function () {
        preview.classList.remove('nw-show');
      }, 8000);
    }
  }, 4000);

  previewCloseBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    preview.classList.remove('nw-show');
    if (previewDismissTimeout) clearTimeout(previewDismissTimeout);
  });

  // --- Event listeners ---
  btn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  textarea.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 60) + 'px';
  });

  sendBtn.addEventListener('click', sendMessage);

  // --- Functions ---
  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add('nw-open');
      preview.classList.remove('nw-show');
      if (previewTimeout) clearTimeout(previewTimeout);
      if (previewDismissTimeout) clearTimeout(previewDismissTimeout);

      if (!hasGreeted) {
        hasGreeted = true;
        appendMessage('agent', config.greeting);
        conversationHistory.push({ role: 'assistant', content: config.greeting });
        saveConversation();
      }

      setTimeout(function () {
        textarea.focus();
      }, 350);
    } else {
      panel.classList.remove('nw-open');
    }
  }

  function sendMessage() {
    if (isWaiting) return;
    var text = textarea.value.trim();
    if (!text) return;

    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
    saveConversation();

    textarea.value = '';
    textarea.style.height = 'auto';
    setWaiting(true);
    showTyping();

    var payload = {
      sessionId: sessionId,
      clientId: config.clientId,
      message: text,
      messages: conversationHistory.slice(0, -1),
    };

    fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        removeTyping();
        setWaiting(false);

        var reply = data.message || 'Sorry, I could not respond.';
        appendMessage('agent', reply);
        conversationHistory.push({ role: 'assistant', content: reply });
        saveConversation();

        if (data.leadCaptured) {
          leadCaptured = true;
          showLeadSuccess();
        }
      })
      .catch(function () {
        removeTyping();
        setWaiting(false);
        appendMessage(
          'agent',
          'Having trouble connecting. Please try again or call us directly.'
        );
      });
  }

  function appendMessage(type, text, skipScroll) {
    var div = document.createElement('div');
    div.className = 'nw-msg ' + (type === 'user' ? 'nw-msg-user' : 'nw-msg-agent');
    if (type === 'user') {
      div.style.background = config.widgetColor;
    }
    div.textContent = text;
    messagesEl.appendChild(div);
    if (!skipScroll) scrollToBottom();
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'nw-typing';
    div.id = 'nw-typing-indicator';
    div.innerHTML =
      '<div class="nw-typing-dot"></div>' +
      '<div class="nw-typing-dot"></div>' +
      '<div class="nw-typing-dot"></div>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    var el = document.getElementById('nw-typing-indicator');
    if (el) el.remove();
  }

  function showLeadSuccess() {
    var div = document.createElement('div');
    div.className = 'nw-success';
    div.innerHTML =
      '<div class="nw-checkmark"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>' +
      "<span>We'll be in touch soon! Feel free to close this chat or ask another question.</span>";
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function setWaiting(val) {
    isWaiting = val;
    sendBtn.disabled = val;
    textarea.disabled = val;
    if (!val) textarea.focus();
  }

  function scrollToBottom() {
    setTimeout(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  function saveConversation() {
    try {
      sessionStorage.setItem('nw_messages', JSON.stringify(conversationHistory));
    } catch (e) {
      // sessionStorage full or unavailable
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
})();
