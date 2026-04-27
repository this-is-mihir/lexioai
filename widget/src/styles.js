// ─── STYLES.JS ───────────────────────────────────────────
// All CSS styles as JavaScript string

export function getStyles(primaryColor = '#7F77DD', position = 'bottom-right', bubbleSize = 'medium') {
  // Position values
  const positionMap = {
    'bottom-right': { bottom: '20px', right: '20px', left: 'auto', top: 'auto' },
    'bottom-left': { bottom: '20px', left: '20px', right: 'auto', top: 'auto' },
  };

  const positionStyle = positionMap[position] || positionMap['bottom-right'];
  
  // Bubble size values
  const bubbleSizeMap = {
    'small': { width: '56px', height: '56px', fontSize: '20px' },
    'medium': { width: '60px', height: '60px', fontSize: '24px' },
    'large': { width: '64px', height: '64px', fontSize: '28px' },
  };

  const bubbleStyle = bubbleSizeMap[bubbleSize] || bubbleSizeMap['medium'];

  // Chat window size
  const chatSizeMap = {
    'small': { width: '320px', height: '420px', chatBottom: '76px' },
    'medium': { width: '380px', height: '500px', chatBottom: '90px' },
    'large': { width: '450px', height: '600px', chatBottom: '104px' },
  };

  const chatStyle = chatSizeMap[bubbleSize] || chatSizeMap['medium'];

  return `
    /* Reset & Base */
    .lx-widget-container * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    /* Main Container */
    .lx-widget-container {
      position: fixed !important;
      bottom: ${positionStyle.bottom} !important;
      right: ${positionStyle.right} !important;
      left: ${positionStyle.left} !important;
      top: ${positionStyle.top} !important;
      z-index: 2147483647 !important;
      isolation: isolate !important;
      font-size: 14px;
      pointer-events: none;
    }

    /* Floating Bubble */
    .lx-bubble {
      width: ${bubbleStyle.width};
      height: ${bubbleStyle.height};
      border-radius: 50%;
      background: ${primaryColor};
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${bubbleStyle.fontSize};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      pointer-events: auto;
      padding: 0;
    }

    .lx-bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .lx-bubble:active {
      transform: scale(0.95);
    }

    /* Bubble Avatar Image */
    .lx-bubble-avatar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    /* Unread Badge */
    .lx-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      border: 2px solid white;
    }

    /* Chat Window */
    .lx-window {
      position: fixed;
      z-index: 2147483647 !important;
      bottom: ${chatStyle.chatBottom};
      right: ${positionStyle.right};
      left: ${positionStyle.left};
      top: auto;
      width: ${chatStyle.width};
      height: ${chatStyle.height};
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: lx-slideUp 0.3s ease-out;
      pointer-events: auto;
    }

    /* Adjust chat position based on bubble position */
    .lx-window { bottom: ${chatStyle.chatBottom}; top: auto; }
    ${position === 'bottom-left' ? `.lx-window { left: 20px; right: auto; }` : ''}
    ${position === 'bottom-right' ? `.lx-window { right: 20px; left: auto; }` : ''}

    @keyframes lx-slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Dark mode */
    .lx-window.dark {
      background: #1a1a1a;
      color: white;
    }

    /* Header */
    .lx-header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 12px 12px 0 0;
    }

    .lx-header-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 15px;
    }

    .lx-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      overflow: hidden;
    }

    .lx-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .lx-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      transition: transform 0.2s;
    }

    .lx-close-btn:hover {
      transform: scale(1.2);
    }

    /* Messages Container */
    .lx-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f5f5f5;
    }

    .lx-messages.dark {
      background: #2a2a2a;
    }

    /* Message Bubble */
    .lx-message {
      display: flex;
      animation: lx-fadeIn 0.3s ease-out;
    }

    @keyframes lx-fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Bot Message */
    .lx-message-bot {
      justify-content: flex-start;
    }

    .lx-message-bot .lx-message-content {
      background: white;
      color: #333;
      border-radius: 12px 12px 12px 2px;
      padding: 10px 14px;
      max-width: 80%;
      word-wrap: break-word;
      white-space: pre-wrap;
      line-height: 1.4;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .lx-messages.dark .lx-message-bot .lx-message-content {
      background: #3a3a3a;
      color: white;
    }

    .lx-message-content a {
      color: #2563eb;
      text-decoration: underline;
      word-break: break-all;
      font-weight: 600;
    }

    .lx-messages.dark .lx-message-content a {
      color: #93c5fd;
    }

    /* User Message */
    .lx-message-user {
      justify-content: flex-end;
    }

    .lx-message-user .lx-message-content {
      background: ${primaryColor};
      color: white;
      border-radius: 12px 12px 2px 12px;
      padding: 10px 14px;
      max-width: 80%;
      word-wrap: break-word;
      white-space: pre-wrap;
      line-height: 1.4;
    }

    /* Typing Indicator */
    .lx-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      background: white;
      padding: 10px 14px;
      border-radius: 12px;
      width: fit-content;
    }

    .lx-messages.dark .lx-typing {
      background: #3a3a3a;
    }

    .lx-typing span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
      animation: lx-typing 1.4s infinite;
    }

    .lx-typing span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .lx-typing span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes lx-typing {
      0%, 60%, 100% {
        opacity: 0.5;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-10px);
      }
    }

    /* Input Area */
    .lx-input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: white;
      border-top: 1px solid #e0e0e0;
      align-items: center;
    }

    .lx-messages.dark ~ .lx-input-area {
      background: #2a2a2a;
      border-top-color: #3a3a3a;
    }

    .lx-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 20px;
      padding: 10px 14px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      background: white;
      color: #333;
    }

    .lx-input:focus {
      border-color: ${primaryColor};
    }

    .lx-messages.dark ~ .lx-input-area .lx-input {
      background: #3a3a3a;
      border-color: #4a4a4a;
      color: white;
    }

    .lx-send-btn {
      background: ${primaryColor};
      color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s;
    }

    .lx-send-btn:hover {
      background: ${darkenColor(primaryColor, 10)};
    }

    .lx-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Lead Form */
    .lx-lead-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .lx-form-title {
      font-weight: 600;
      font-size: 15px;
      color: #333;
    }

    .lx-messages.dark .lx-form-title {
      color: white;
    }

    .lx-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .lx-form-label {
      font-size: 13px;
      font-weight: 500;
      color: #555;
    }

    .lx-messages.dark .lx-form-label {
      color: #aaa;
    }

    .lx-form-input {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      font-size: 14px;
      background: white;
      color: #333;
    }

    .lx-form-input:focus {
      outline: none;
      border-color: ${primaryColor};
      box-shadow: 0 0 0 2px ${primaryColor}33;
    }

    .lx-messages.dark .lx-form-input {
      background: #3a3a3a;
      border-color: #4a4a4a;
      color: white;
    }

    .lx-form-submit {
      background: ${primaryColor};
      color: white;
      border: none;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .lx-form-submit:hover {
      background: ${darkenColor(primaryColor, 10)};
    }

    /* Powered By */
    .lx-powered-by {
      text-align: center;
      font-size: 11px;
      color: #999;
      padding: 8px;
      border-top: 1px solid #e0e0e0;
    }

    .lx-messages.dark ~ .lx-powered-by {
      border-top-color: #3a3a3a;
      color: #666;
    }

    /* Mobile Responsive */
    @media (max-width: 480px) {
      .lx-bubble {
        position: fixed !important;
        width: 50px;
        height: 50px;
        font-size: 20px;
        bottom: 16px;
        ${position === 'bottom-left' ? 'left: 16px; right: auto;' : 'right: 16px; left: auto;'}
        z-index: 2147483647 !important;
        pointer-events: auto;
      }

      .lx-window {
        position: fixed !important;
        width: 100% !important;
        height: 100% !important;
        max-height: 100vh !important;
        max-height: 100dvh !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: 0 !important;
        border-radius: 0 !important;
        z-index: 2147483647 !important;
        pointer-events: auto;
      }

      .lx-header {
        border-radius: 0;
        padding: 14px 16px;
        padding-top: max(14px, env(safe-area-inset-top));
      }

      .lx-messages {
        padding: 12px;
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .lx-message-bot .lx-message-content,
      .lx-message-user .lx-message-content {
        max-width: 85%;
        font-size: 14px;
      }

      .lx-input-area {
        padding: 10px 12px;
        padding-bottom: max(10px, env(safe-area-inset-bottom));
      }

      .lx-input {
        font-size: 16px; /* Prevents iOS zoom on focus */
      }

      .lx-powered-by {
        padding-bottom: max(8px, env(safe-area-inset-bottom));
      }
    }

    /* Scrollbar */
    .lx-messages::-webkit-scrollbar {
      width: 6px;
    }

    .lx-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .lx-messages::-webkit-scrollbar-thumb {
      background: ${primaryColor}80;
      border-radius: 3px;
    }

    .lx-messages::-webkit-scrollbar-thumb:hover {
      background: ${primaryColor};
    }
  `;
}

// Helper function to darken color
function darkenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
