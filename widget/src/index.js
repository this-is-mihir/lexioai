// ─── INDEX.JS ───────────────────────────────────────────
// Main entry point - Widget initialization

import * as API from './api';
import * as Storage from './storage';
import * as UI from './ui';
import { getStyles } from './styles';

class LexioaiWidget {
  constructor() {
    this.embedKey = null;
    this.botConfig = null;
    this.conversationId = null;
    this.messageCount = 0;  // ← Track messages for lead form
    this.shadowRoot = null;
    this.container = null;
    this.windowElement = null;
    this.messagesContainer = null;
    this.inputArea = null;
    this.bubble = null;
    this.isOpen = false;
    this.isSending = false;
    this.leadCaptureShown = false;
  }

  // Initialize widget
  async init() {
    try {
      this.configureApiBaseUrl();

      // Get embed key from script tag
      this.embedKey = this.getEmbedKeyFromScript();
      if (!this.embedKey) {
        console.error('[Lexioai] No embed key found in script tag');
        return;
      }

      // Store embed key
      Storage.setEmbedKey(this.embedKey);

      // Check page URL is valid
      const pageUrl = window.location.href;
      if (!this.isValidURL(pageUrl)) {
        console.error('[Lexioai] Invalid page URL');
        return;
      }

      // Fetch bot configuration
      
      this.botConfig = await API.fetchBotConfig(this.embedKey);

      // Check if bot config received
      if (!this.botConfig) {
        console.warn('[Lexioai] Bot configuration not received');
        return;
      }

      

      // Create and inject widget
      this.injectWidget();

      // Restore chat state from localStorage
      this.restoreState();

      // Attach event listeners
      this.attachEventListeners();

      
    } catch (error) {
      console.error('[Lexioai] Initialization error:', error);
    }
  }

  // Get embed key from script tag attribute
  getEmbedKeyFromScript() {
    const scripts = document.querySelectorAll('script[src*="widget.js"]');
    for (const script of scripts) {
      const url = new URL(script.src, window.location.href);
      const key = url.searchParams.get('key');
      if (key) return key;
    }
    return null;
  }

  getWidgetScriptElement() {
    const scripts = document.querySelectorAll('script[src*="widget.js"]');
    for (const script of scripts) {
      const url = new URL(script.src, window.location.href);
      if (url.searchParams.get('key')) return script;
    }
    return scripts[scripts.length - 1] || null;
  }

  configureApiBaseUrl() {
    const script = this.getWidgetScriptElement();
    const attrValue = script?.getAttribute('data-api-base');
    API.setApiBaseUrl(attrValue);
    
  }

  // Validate URL
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Inject widget into page via Shadow DOM
  injectWidget() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'lx-widget-container';

    // Attach Shadow DOM
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Get appearance settings
    const appearance = this.botConfig.appearance || {};
    const position = appearance.position || 'bottom-right';
    const bubbleSize = appearance.bubbleSize || 'medium';
    const primaryColor = appearance.brandColor || appearance.primaryColor || '#7F77DD';

    // Inject styles with appearance settings
    const styleEl = document.createElement('style');
    styleEl.textContent = getStyles(primaryColor, position, bubbleSize);
    this.shadowRoot.appendChild(styleEl);

    // Create bubble
    const botName = this.botConfig.botName || this.botConfig.name || 'Assistant';
    this.bubble = UI.createBubble(botName, 0, appearance);
    this.shadowRoot.appendChild(this.bubble);

    // Create chat window
    const showPoweredBy = !appearance.customBranding; // Hide if custom branding enabled
    const { window, messages, inputArea, closeBtn } = UI.createChatWindow(
      botName,
      primaryColor,
      false,
      showPoweredBy,
      this.botConfig.platformBranding?.platformName || 'Lexioai',
      appearance
    );
    this.windowElement = window;
    this.messagesContainer = messages;
    this.inputArea = inputArea;

    // Hide window initially
    this.windowElement.style.display = 'none';
    this.shadowRoot.appendChild(this.windowElement);

    // Append to document body
    document.body.appendChild(this.container);

    
  }

  // Restore chat state from localStorage
  restoreState() {
    const isOpen = Storage.isChatOpen();
    const messages = Storage.getMessages();

    if (isOpen) {
      this.openChat();
    }

    // Restore messages
    if (messages.length > 0) {
      messages.forEach(msg => {
        const messageEl = UI.createMessage(msg.content, msg.isBot);
        this.messagesContainer.appendChild(messageEl);
      });
      UI.scrollMessagesToBottom(this.messagesContainer);
    } else {
      // Show welcome message on first open
      this.showWelcomeMessage();
    }
  }

  // Show welcome message
  showWelcomeMessage() {
    const behavior = this.botConfig.behavior || {};
    const welcomeMsg = behavior.welcomeMessage || '👋 Hi! How can I help you today?';

    const messageEl = UI.createMessage(welcomeMsg, true);
    this.messagesContainer.appendChild(messageEl);

    Storage.addMessage({
      content: welcomeMsg,
      isBot: true
    });

    UI.scrollMessagesToBottom(this.messagesContainer);

    // Auto-show lead form if enabled
    if (this.botConfig.leadCapture?.enabled && !this.leadCaptureShown) {
      setTimeout(() => {
        this.showLeadCaptureForm();
      }, 1500);  // Delay 1.5s for better UX
    }
  }

  // Open chat window
  async openChat() {
    this.windowElement.style.display = 'flex';
    this.isOpen = true;
    Storage.setChatOpen(true);

    // Start conversation if not already started
    if (!this.conversationId) {
      const conversationId = Storage.getConversationId();
      if (conversationId) {
        // Restore from localStorage
        this.conversationId = conversationId;
      } else {
        // Start new conversation
        try {
          
          const response = await API.startConversation(this.embedKey, {
            visitorId: Storage.getVisitorId(),
            visitorDevice: navigator.userAgent,
            pageUrl: window.location.href
          });

          
          this.conversationId = response.conversationId;
          
          Storage.setConversationId(this.conversationId);

          // Clear existing messages and show welcome
          this.messagesContainer.innerHTML = '';
          Storage.clearMessages();

          if (response.welcomeMessage) {
            const messageEl = UI.createMessage(response.welcomeMessage, true);
            this.messagesContainer.appendChild(messageEl);
            Storage.addMessage({
              content: response.welcomeMessage,
              isBot: true
            });
          }
        } catch (error) {
          console.error('[Lexioai] Failed to start conversation:', error);
          return;
        }
      }
    }

    // Focus input
    setTimeout(() => {
      const input = UI.getMessageInput(this.inputArea);
      input.focus();
    }, 300);
  }

  // Close chat window
  closeChat() {
    this.windowElement.style.display = 'none';
    this.isOpen = false;
    Storage.setChatOpen(false);
  }

  // Send message
  async sendMessage() {
    const input = UI.getMessageInput(this.inputArea);
    const message = input.value.trim();

    if (!message) return;

    // Wait for conversation to be initialized
    if (!this.conversationId) {
      console.warn('[Lexioai] Waiting for conversation to initialize...');
      let attempts = 0;
      while (!this.conversationId && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!this.conversationId) {
        console.error('[Lexioai] Conversation failed to initialize');
        input.placeholder = 'Chat is initializing. Please wait...';
        input.disabled = true;
        return;
      }
    }

    // Disable input
    input.disabled = true;
    this.isSending = true;

    try {
      // Show user message
      const userMsgEl = UI.createMessage(message, false);
      this.messagesContainer.appendChild(userMsgEl);

      Storage.addMessage({
        content: message,
        isBot: false
      });

      input.value = '';

      // Show typing indicator
      const typingEl = UI.createTypingIndicator();
      this.messagesContainer.appendChild(typingEl);
      UI.scrollMessagesToBottom(this.messagesContainer);

      // Send to backend
      const conversationId = this.conversationId;
      const visitorId = Storage.getVisitorId();


      const response = await API.sendMessage(this.embedKey, {
        message,
        conversationId,
        visitorId,
        pageUrl: window.location.href
      });

      // Remove typing indicator
      typingEl.remove();

      // Save conversation ID if new
      if (response.conversationId && !conversationId) {
        Storage.setConversationId(response.conversationId);
      }

      // Show bot response
      const botReply = response.reply || 'Sorry, I could not understand that.';
      const botMsgEl = UI.createMessage(botReply, true);
      this.messagesContainer.appendChild(botMsgEl);

      Storage.addMessage({
        content: botReply,
        isBot: true
      });

      // Count messages - show lead form after 3 exchanges if enabled
      this.messageCount++;
      if (this.messageCount >= 3 && 
          this.botConfig.leadCapture?.enabled && 
          !this.leadCaptureShown) {
        setTimeout(() => {
          this.showLeadCaptureForm();
        }, 500);
      }

      UI.scrollMessagesToBottom(this.messagesContainer);
    } catch (error) {
      console.error('[Lexioai] Error sending message:', error);

      // Show error message
      const errorEl = UI.createMessage('Oops! Something went wrong. Please try again.', true);
      this.messagesContainer.appendChild(errorEl);

      UI.scrollMessagesToBottom(this.messagesContainer);
    } finally {
      input.disabled = false;
      this.isSending = false;
      input.focus();
    }
  }

  // Show lead capture form
  showLeadCaptureForm() {
    this.leadCaptureShown = true;

    // Ensure fields is an array
    let fieldsList = this.botConfig.leadCapture?.fields;
    if (!Array.isArray(fieldsList)) {
      fieldsList = ['name', 'email', 'phone'];
    }

    const form = UI.createLeadForm(fieldsList);

    const formContainer = document.createElement('div');
    formContainer.style.padding = '16px';
    this.messagesContainer.appendChild(formContainer);
    formContainer.appendChild(form);

    // Handle form submit
    form.addEventListener('submit', (e) => this.handleLeadSubmit(e));

    UI.scrollMessagesToBottom(this.messagesContainer);
  }

  // Handle lead form submit
  async handleLeadSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = UI.getFormData(form);

    try {
      const conversationId = Storage.getConversationId();
      const visitorId = Storage.getVisitorId();

      await API.submitLead(this.embedKey, {
        ...formData,
        conversationId,
        visitorId
      });

      // Show success message
      form.innerHTML = '<div style="text-align: center; color: #22c55e; font-weight: 600;">✓ Thank you! We\'ll be in touch soon.</div>';


    } catch (error) {
      console.error('[Lexioai] Error submitting lead:', error);
      alert('Failed to submit. Please try again.');
    }
  }

  // Attach event listeners
  attachEventListeners() {
    // Bubble click - toggle chat
    this.bubble.addEventListener('click', () => {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    });

    // Close button
    const closeBtn = this.windowElement.querySelector('.lx-close-btn');
    closeBtn.addEventListener('click', () => this.closeChat());

    // Send button
    const sendBtn = UI.getSendButton(this.inputArea);
    sendBtn.addEventListener('click', () => this.sendMessage());

    // Enter key on input
    const input = UI.getMessageInput(this.inputArea);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });


  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const widget = new LexioaiWidget();
    widget.init();
  });
} else {
  const widget = new LexioaiWidget();
  widget.init();
}

// Export for external use
window.LexioaiWidget = LexioaiWidget;
