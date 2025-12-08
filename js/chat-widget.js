/**
 * Amplifier Documentation Chat Widget
 * Uses GPT-5.1 with site context for documentation assistance
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    defaultModel: 'gpt-5.1',
    models: [
      { id: 'gpt-5.1', name: 'GPT-5.1 (Best)', contextWindow: 400000 },
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1000000 },
      { id: 'o4-mini', name: 'o4-mini (Fast)', contextWindow: 200000 }
    ],
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    contextPath: 'context/site-context.txt',
    storageKey: 'amplifier_chat_settings'
  };

  // State
  let siteContext = '';
  let conversationHistory = [];
  let isLoading = false;
  let settings = {
    apiKey: '',
    model: CONFIG.defaultModel,
    rememberKey: false
  };

  // Load settings from storage
  function loadSettings() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        settings = { ...settings, ...parsed };
        if (!settings.rememberKey) {
          settings.apiKey = '';
        }
      }
    } catch (e) {
      console.warn('Failed to load chat settings:', e);
    }
  }

  // Save settings to storage
  function saveSettings() {
    try {
      const toSave = { ...settings };
      if (!settings.rememberKey) {
        toSave.apiKey = '';
      }
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save chat settings:', e);
    }
  }

  // Load site context
  async function loadSiteContext() {
    try {
      const response = await fetch(CONFIG.contextPath);
      if (response.ok) {
        siteContext = await response.text();
        console.log('Loaded site context: ' + siteContext.length + ' characters');
      } else {
        console.warn('Site context not found, chat will work with reduced context');
      }
    } catch (e) {
      console.warn('Failed to load site context:', e);
    }
  }

  // Build system message with context
  function buildSystemMessage() {
    const currentSection = getCurrentSection();

    return 'You are an expert assistant for Amplifier, Microsoft\'s ultra-thin kernel for modular AI agents.\n' +
      'You have access to the complete Amplifier documentation and should provide accurate, helpful answers.\n\n' +
      'Key facts about Amplifier:\n' +
      '- Core is ~2,600 lines providing mechanisms, not policies\n' +
      '- Uses Linux-kernel philosophy: tiny stable center, swappable modules at edges\n' +
      '- Module types: providers, orchestrators, contexts, tools, hooks\n' +
      '- Only providers use Python entry points; orchestrators/contexts use local implementations\n\n' +
      'Current user is viewing: ' + currentSection + '\n\n' +
      'DOCUMENTATION CONTEXT:\n' +
      (siteContext ? siteContext : 'Documentation context not loaded. Answer based on your knowledge of Amplifier.') + '\n\n' +
      'When answering:\n' +
      '- Be concise but complete\n' +
      '- Reference specific sections when relevant\n' +
      '- Provide code examples when helpful\n' +
      '- If unsure, say so rather than guessing';
  }

  // Get current visible section
  function getCurrentSection() {
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
      const h1 = activeSection.querySelector('h1');
      return h1 ? h1.textContent : 'Documentation';
    }
    return 'Home';
  }

  // Create a text node safely
  function createTextNode(text) {
    return document.createTextNode(text);
  }

  // Create element with attributes
  function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
  }

  // Parse and render message content safely (plain text with code block support)
  function renderMessageContent(content, container) {
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    parts.forEach(part => {
      if (part.startsWith('```')) {
        // Code block
        const codeContent = part.slice(3, -3);
        const firstNewline = codeContent.indexOf('\n');
        const code = firstNewline > -1 ? codeContent.slice(firstNewline + 1) : codeContent;

        const pre = createElement('pre');
        const codeEl = createElement('code');
        codeEl.textContent = code;
        pre.appendChild(codeEl);
        container.appendChild(pre);
      } else if (part.trim()) {
        // Regular text - handle inline code and line breaks
        const lines = part.split('\n');
        lines.forEach((line, i) => {
          // Handle inline code
          const inlineParts = line.split(/(`[^`]+`)/g);
          inlineParts.forEach(inlinePart => {
            if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
              const codeEl = createElement('code');
              codeEl.textContent = inlinePart.slice(1, -1);
              container.appendChild(codeEl);
            } else if (inlinePart) {
              // Handle bold
              const boldParts = inlinePart.split(/(\*\*[^*]+\*\*)/g);
              boldParts.forEach(boldPart => {
                if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                  const strong = createElement('strong');
                  strong.textContent = boldPart.slice(2, -2);
                  container.appendChild(strong);
                } else if (boldPart) {
                  container.appendChild(createTextNode(boldPart));
                }
              });
            }
          });
          // Add line break between lines (but not after last line)
          if (i < lines.length - 1) {
            container.appendChild(document.createElement('br'));
          }
        });
      }
    });
  }

  // Create message element
  function createMessageElement(role, content) {
    const msg = createElement('div', 'chat-message ' + role);
    renderMessageContent(content, msg);
    return msg;
  }

  // Send message to OpenAI
  async function sendMessage(userMessage) {
    if (!settings.apiKey) {
      showError('Please enter your OpenAI API key in settings');
      return;
    }

    if (isLoading) return;
    isLoading = true;

    // Add user message to history
    conversationHistory.push({ role: 'user', content: userMessage });
    renderMessages();
    showTypingIndicator(true);

    try {
      const messages = [
        { role: 'system', content: buildSystemMessage() },
        ...conversationHistory
      ];

      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + settings.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: settings.model,
          messages: messages,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API error: ' + response.status);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(function(line) {
          return line.startsWith('data: ');
        });

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              updateStreamingMessage(assistantMessage);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }

      // Finalize assistant message
      conversationHistory.push({ role: 'assistant', content: assistantMessage });
      renderMessages();

    } catch (error) {
      console.error('Chat error:', error);
      showError(error.message);
      conversationHistory.pop();
    } finally {
      isLoading = false;
      showTypingIndicator(false);
    }
  }

  // Render all messages
  function renderMessages() {
    const container = document.getElementById('chat-messages');
    const welcome = document.getElementById('chat-welcome');

    if (conversationHistory.length === 0) {
      container.style.display = 'none';
      welcome.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    welcome.style.display = 'none';

    // Clear container safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Add messages
    conversationHistory.forEach(function(msg) {
      container.appendChild(createMessageElement(msg.role, msg.content));
    });

    container.scrollTop = container.scrollHeight;
  }

  // Update streaming message in real-time
  function updateStreamingMessage(content) {
    const container = document.getElementById('chat-messages');
    let streamingEl = container.querySelector('.chat-message.streaming');

    if (!streamingEl) {
      streamingEl = createElement('div', 'chat-message assistant streaming');
      container.appendChild(streamingEl);
    }

    // Clear and re-render
    while (streamingEl.firstChild) {
      streamingEl.removeChild(streamingEl.firstChild);
    }
    renderMessageContent(content, streamingEl);
    container.scrollTop = container.scrollHeight;
  }

  // Show/hide typing indicator
  function showTypingIndicator(show) {
    const container = document.getElementById('chat-messages');
    const existing = container.querySelector('.chat-typing');

    if (show && !existing) {
      const indicator = createElement('div', 'chat-typing');
      for (let i = 0; i < 3; i++) {
        indicator.appendChild(document.createElement('span'));
      }
      container.appendChild(indicator);
      container.scrollTop = container.scrollHeight;
    } else if (!show && existing) {
      existing.remove();
    }

    const streaming = container.querySelector('.chat-message.streaming');
    if (!show && streaming) {
      streaming.classList.remove('streaming');
    }
  }

  // Show error message
  function showError(message) {
    const container = document.getElementById('chat-messages');
    const welcome = document.getElementById('chat-welcome');

    container.style.display = 'flex';
    welcome.style.display = 'none';

    const errorEl = createElement('div', 'chat-message error', message);
    container.appendChild(errorEl);
    container.scrollTop = container.scrollHeight;
  }

  // Toggle chat panel
  function toggleChat() {
    const panel = document.getElementById('chat-panel');
    const toggle = document.getElementById('chat-toggle');

    panel.classList.toggle('open');
    toggle.classList.toggle('open');

    if (panel.classList.contains('open')) {
      document.getElementById('chat-input').focus();
    }
  }

  // Toggle settings panel
  function toggleSettings() {
    const settingsPanel = document.getElementById('chat-settings');
    settingsPanel.classList.toggle('open');
  }

  // Create SVG icon
  function createSvgIcon(pathData, viewBox) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox || '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    return svg;
  }

  // Initialize widget
  function init() {
    loadSettings();
    loadSiteContext();
    createWidget();
    bindEvents();
  }

  // Create widget using DOM methods
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'amplifier-chat-widget';

    // Toggle Button
    const toggleBtn = createElement('button', 'chat-toggle');
    toggleBtn.id = 'chat-toggle';
    toggleBtn.title = 'Chat with documentation';

    const chatIcon = createSvgIcon('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z');
    chatIcon.classList.add('icon-chat');
    toggleBtn.appendChild(chatIcon);

    const closeIcon = createSvgIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
    closeIcon.classList.add('icon-close');
    toggleBtn.appendChild(closeIcon);

    widget.appendChild(toggleBtn);

    // Chat Panel
    const panel = createElement('div', 'chat-panel');
    panel.id = 'chat-panel';

    // Header
    const header = createElement('div', 'chat-header');

    const headerLeft = createElement('div', 'chat-header-left');
    const headerIcon = createElement('div', 'chat-header-icon');
    headerIcon.appendChild(createSvgIcon('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'));
    headerLeft.appendChild(headerIcon);

    const headerText = document.createElement('div');
    const headerTitle = createElement('div', 'chat-header-title', 'Amplifier Assistant');
    const headerSubtitle = createElement('div', 'chat-header-subtitle', 'Powered by GPT-5.1');
    headerText.appendChild(headerTitle);
    headerText.appendChild(headerSubtitle);
    headerLeft.appendChild(headerText);
    header.appendChild(headerLeft);

    const settingsBtn = createElement('button', 'chat-settings-btn');
    settingsBtn.id = 'chat-settings-btn';
    settingsBtn.title = 'Settings';
    const gearSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    gearSvg.setAttribute('viewBox', '0 0 24 24');
    gearSvg.setAttribute('fill', 'none');
    gearSvg.setAttribute('stroke', 'currentColor');
    gearSvg.setAttribute('stroke-width', '2');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '3');
    gearSvg.appendChild(circle);
    const gearPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    gearPath.setAttribute('d', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z');
    gearSvg.appendChild(gearPath);
    settingsBtn.appendChild(gearSvg);
    header.appendChild(settingsBtn);

    panel.appendChild(header);

    // Settings Panel
    const settingsPanel = createElement('div', 'chat-settings');
    settingsPanel.id = 'chat-settings';

    // API Key row
    const apiKeyRow = createElement('div', 'chat-settings-row');
    const apiKeyLabel = createElement('label', 'chat-settings-label', 'OpenAI API Key');
    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.id = 'chat-api-key';
    apiKeyInput.className = 'chat-settings-input';
    apiKeyInput.placeholder = 'sk-...';
    apiKeyInput.value = settings.apiKey;
    apiKeyRow.appendChild(apiKeyLabel);
    apiKeyRow.appendChild(apiKeyInput);
    settingsPanel.appendChild(apiKeyRow);

    // Model row
    const modelRow = createElement('div', 'chat-settings-row');
    const modelLabel = createElement('label', 'chat-settings-label', 'Model');
    const modelSelect = document.createElement('select');
    modelSelect.id = 'chat-model';
    modelSelect.className = 'chat-settings-select';
    CONFIG.models.forEach(function(m) {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      if (m.id === settings.model) option.selected = true;
      modelSelect.appendChild(option);
    });
    modelRow.appendChild(modelLabel);
    modelRow.appendChild(modelSelect);
    settingsPanel.appendChild(modelRow);

    // Remember checkbox row
    const rememberRow = createElement('div', 'chat-settings-row');
    const rememberLabel = createElement('label', 'chat-settings-checkbox');
    const rememberCheckbox = document.createElement('input');
    rememberCheckbox.type = 'checkbox';
    rememberCheckbox.id = 'chat-remember';
    if (settings.rememberKey) rememberCheckbox.checked = true;
    rememberLabel.appendChild(rememberCheckbox);
    rememberLabel.appendChild(createTextNode(' Remember API key (stored in browser)'));
    rememberRow.appendChild(rememberLabel);
    settingsPanel.appendChild(rememberRow);

    panel.appendChild(settingsPanel);

    // Welcome State
    const welcome = createElement('div', 'chat-welcome');
    welcome.id = 'chat-welcome';
    const welcomeIcon = createElement('div', 'chat-welcome-icon');
    welcomeIcon.appendChild(createSvgIcon('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'));
    welcome.appendChild(welcomeIcon);
    welcome.appendChild(createElement('h3', null, 'Ask about Amplifier'));
    welcome.appendChild(createElement('p', null, 'I have access to the complete documentation and can help you understand architecture, write code, or troubleshoot issues.'));
    const welcomeHint = createElement('div', 'chat-welcome-hint', 'Click the gear icon to enter your OpenAI API key');
    welcome.appendChild(welcomeHint);
    panel.appendChild(welcome);

    // Messages Container
    const messages = createElement('div', 'chat-messages');
    messages.id = 'chat-messages';
    messages.style.display = 'none';
    panel.appendChild(messages);

    // Input Area
    const inputArea = createElement('div', 'chat-input-area');
    const inputWrapper = createElement('div', 'chat-input-wrapper');

    const textarea = document.createElement('textarea');
    textarea.id = 'chat-input';
    textarea.className = 'chat-input';
    textarea.placeholder = 'Ask about Amplifier...';
    textarea.rows = 1;
    inputWrapper.appendChild(textarea);

    const sendBtn = createElement('button', 'chat-send-btn');
    sendBtn.id = 'chat-send';
    sendBtn.title = 'Send message';
    sendBtn.appendChild(createSvgIcon('M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'));
    inputWrapper.appendChild(sendBtn);

    inputArea.appendChild(inputWrapper);
    panel.appendChild(inputArea);

    widget.appendChild(panel);
    document.body.appendChild(widget);
  }

  // Bind event listeners
  function bindEvents() {
    document.getElementById('chat-toggle').addEventListener('click', toggleChat);
    document.getElementById('chat-settings-btn').addEventListener('click', toggleSettings);

    document.getElementById('chat-api-key').addEventListener('change', function(e) {
      settings.apiKey = e.target.value;
      saveSettings();
    });

    document.getElementById('chat-model').addEventListener('change', function(e) {
      settings.model = e.target.value;
      saveSettings();
      const model = CONFIG.models.find(function(m) { return m.id === settings.model; });
      document.querySelector('.chat-header-subtitle').textContent = 'Powered by ' + (model?.name || settings.model);
    });

    document.getElementById('chat-remember').addEventListener('change', function(e) {
      settings.rememberKey = e.target.checked;
      saveSettings();
    });

    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    sendBtn.addEventListener('click', function() {
      const message = input.value.trim();
      if (message) {
        input.value = '';
        input.style.height = 'auto';
        sendMessage(message);
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    input.addEventListener('input', function() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    input.addEventListener('input', function() {
      sendBtn.disabled = !input.value.trim() || isLoading;
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const panel = document.getElementById('chat-panel');
        if (panel.classList.contains('open')) {
          toggleChat();
        }
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
