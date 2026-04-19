// ─── API.JS ───────────────────────────────────────────────
// Backend API calls

const DEFAULT_API_BASE_URL = 'http://localhost:5000/api/v1';
let apiBaseUrl = DEFAULT_API_BASE_URL;

function normalizeApiBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function setApiBaseUrl(value) {
  const normalized = normalizeApiBaseUrl(value);
  if (normalized) {
    apiBaseUrl = normalized;
  }
}

export function getApiBaseUrl() {
  const globalValue =
    typeof window !== 'undefined'
      ? window.LEXIOAI_WIDGET_API_BASE || window.__LEXIOAI_WIDGET_API_BASE
      : '';

  const normalizedGlobal = normalizeApiBaseUrl(globalValue);
  if (normalizedGlobal) {
    return normalizedGlobal;
  }

  return apiBaseUrl;
}

// Fetch bot configuration
export async function fetchBotConfig(embedKey) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/widget/${embedKey}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bot config: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error fetching bot config:', error);
    throw error;
  }
}

// Start new conversation
export async function startConversation(embedKey, payload) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/widget/${embedKey}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Failed to start conversation: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error starting conversation:', error);
    throw error;
  }
}

// Send message to bot
export async function sendMessage(embedKey, payload) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/widget/${embedKey}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Submit lead
export async function submitLead(embedKey, payload) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/widget/${embedKey}/lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Failed to submit lead: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error submitting lead:', error);
    throw error;
  }
}
