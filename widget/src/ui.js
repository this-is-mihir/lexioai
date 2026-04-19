// ─── UI.JS ───────────────────────────────────────────────
// UI creation functions



function getAvatarUrl(avatarImageUrl) {
  return avatarImageUrl || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMessageContent(content) {
  const escaped = escapeHtml(content).replace(/\r\n/g, "\n");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withLinks = withBold.replace(
    /\b((?:https?:\/\/|mailto:|tel:)[^\s<]+)/gi,
    (match) => `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`
  );
  return withLinks.replace(/\n/g, "<br>");
}

export function createBubble(botName, unreadCount = 0, appearance = {}) {
  const bubble = document.createElement('button');
  bubble.className = 'lx-bubble';
  bubble.title = `Chat with ${botName}`;
  
  // Get avatar
  const avatarImageUrl = appearance.avatarImageUrl || null;
  const avatarUrl = getAvatarUrl(avatarImageUrl);

  // Create avatar image or fallback to emoji
  const avatarImg = document.createElement('img');
  avatarImg.className = 'lx-bubble-avatar';
  avatarImg.src = avatarUrl;
  avatarImg.alt = botName;
  avatarImg.onerror = function() {
    // Fallback to emoji if image fails
    this.style.display = 'none';
    bubble.textContent = '💬';
  };
  
  bubble.appendChild(avatarImg);
  
  if (unreadCount > 0) {
    const badge = document.createElement('div');
    badge.className = 'lx-badge';
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    bubble.appendChild(badge);
  }
  
  return bubble;
}

export function createChatWindow(
  botName,
  botColor,
  isDarkMode = false,
  showPoweredBy = true,
  platformName = 'Lexioai',
  appearance = {}
) {
  const window = document.createElement('div');
  window.className = `lx-window ${isDarkMode ? 'dark' : ''}`;
  
  // Get appearance settings
  const chatWindowTitle = appearance.chatWindowTitle || botName || 'Assistant';
  const avatarImageUrl = appearance.avatarImageUrl || null;
  const avatarUrl = getAvatarUrl(avatarImageUrl);
  const inputPlaceholder = appearance.inputPlaceholder || 'Type a message...';

  // Header
  const header = document.createElement('div');
  header.className = 'lx-header';
  header.style.background = botColor;
  
  const headerTitle = document.createElement('div');
  headerTitle.className = 'lx-header-title';
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'lx-avatar';
  
  const avatarImg = document.createElement('img');
  avatarImg.className = 'lx-avatar-img';
  avatarImg.src = avatarUrl;
  avatarImg.alt = chatWindowTitle;
  avatarImg.onerror = function() {
    // Fallback to emoji if image fails
    this.style.display = 'none';
    avatarDiv.textContent = '🤖';
  };
  
  avatarDiv.appendChild(avatarImg);
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = chatWindowTitle;
  
  headerTitle.appendChild(avatarDiv);
  headerTitle.appendChild(titleSpan);
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'lx-close-btn';
  closeBtn.textContent = '✕';
  closeBtn.type = 'button';
  
  header.appendChild(headerTitle);
  header.appendChild(closeBtn);
  
  // Messages Container
  const messages = document.createElement('div');
  messages.className = `lx-messages ${isDarkMode ? 'dark' : ''}`;
  
  // Input Area
  const inputArea = document.createElement('div');
  inputArea.className = 'lx-input-area';
  inputArea.innerHTML = `
    <input type="text" class="lx-input" placeholder="${inputPlaceholder}" />
    <button class="lx-send-btn" type="button">➤</button>
  `;
  
  // Powered By
  const poweredBy = document.createElement('div');
  poweredBy.className = 'lx-powered-by';
  poweredBy.textContent = `Powered by ${platformName}`;
  if (!showPoweredBy) {
    poweredBy.style.display = 'none';
  }
  
  window.appendChild(header);
  window.appendChild(messages);
  window.appendChild(inputArea);
  window.appendChild(poweredBy);
  
  return { window, header, messages, inputArea, closeBtn };
}

export function createMessage(content, isBot) {
  const message = document.createElement('div');
  message.className = `lx-message ${isBot ? 'lx-message-bot' : 'lx-message-user'}`;
  
  const content_div = document.createElement('div');
  content_div.className = 'lx-message-content';
  content_div.innerHTML = formatMessageContent(content);
  
  message.appendChild(content_div);
  return message;
}

export function createTypingIndicator() {
  const typing = document.createElement('div');
  typing.className = 'lx-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  return typing;
}

export function createLeadForm(fields = ['name', 'email', 'phone']) {
  // Ensure fields is array
  if (!Array.isArray(fields)) {
    fields = ['name', 'email', 'phone'];
  }

  const form = document.createElement('form');
  form.className = 'lx-lead-form';
  form.innerHTML = `
    <div class="lx-form-title">Please share your details</div>
  `;
  
  if (fields.includes('name')) {
    form.innerHTML += `
      <div class="lx-form-group">
        <label class="lx-form-label">Name</label>
        <input type="text" class="lx-form-input" name="name" required />
      </div>
    `;
  }
  
  if (fields.includes('email')) {
    form.innerHTML += `
      <div class="lx-form-group">
        <label class="lx-form-label">Email</label>
        <input type="email" class="lx-form-input" name="email" required />
      </div>
    `;
  }
  
  if (fields.includes('phone')) {
    form.innerHTML += `
      <div class="lx-form-group">
        <label class="lx-form-label">Phone</label>
        <input type="tel" class="lx-form-input" name="phone" />
      </div>
    `;
  }
  
  form.innerHTML += `<button type="submit" class="lx-form-submit">Submit</button>`;
  
  return form;
}

export function scrollMessagesToBottom(messagesContainer) {
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 0);
}

export function getMessageInput(inputArea) {
  return inputArea.querySelector('.lx-input');
}

export function getSendButton(inputArea) {
  return inputArea.querySelector('.lx-send-btn');
}

export function getFormData(form) {
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

export function hidePoweredBy(window) {
  const poweredBy = window.querySelector('.lx-powered-by');
  if (poweredBy) {
    poweredBy.style.display = 'none';
  }
}
