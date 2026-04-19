// ─── STORAGE.JS ───────────────────────────────────────────
// localStorage management ke liye

const STORAGE_KEYS = {
  VISITOR_ID: 'lx_visitor_id',
  CONVERSATION_ID: 'lx_conversation_id',
  MESSAGES: 'lx_messages',
  CHAT_OPEN: 'lx_chat_open',
  EMBED_KEY: 'lx_embed_key',
};

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create visitor ID (persistent across page reloads)
export function getVisitorId() {
  let visitorId = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
  if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, visitorId);
  }
  return visitorId;
}

// Get conversation ID
export function getConversationId() {
  return localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
}

// Save conversation ID
export function setConversationId(conversationId) {
  localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId);
}

// Get all messages from storage
export function getMessages() {
  const messages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  return messages ? JSON.parse(messages) : [];
}

// Add message to storage
export function addMessage(message) {
  const messages = getMessages();
  messages.push({
    ...message,
    timestamp: new Date().toISOString()
  });
  // Keep only last 50 messages
  if (messages.length > 50) {
    messages.shift();
  }
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

// Clear messages
export function clearMessages() {
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
}

// Get chat open state
export function isChatOpen() {
  return localStorage.getItem(STORAGE_KEYS.CHAT_OPEN) === 'true';
}

// Set chat open state
export function setChatOpen(isOpen) {
  localStorage.setItem(STORAGE_KEYS.CHAT_OPEN, isOpen ? 'true' : 'false');
}

// Get embed key
export function getEmbedKey() {
  return localStorage.getItem(STORAGE_KEYS.EMBED_KEY);
}

// Set embed key
export function setEmbedKey(embedKey) {
  localStorage.setItem(STORAGE_KEYS.EMBED_KEY, embedKey);
}

// Clear all widget data
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
