# Lexioai Widget

AI-powered embeddable chatbot widget for any website.

## Quick Start

### Installation

```bash
cd d:\lexioai\widget
npm install
```

### Development

```bash
# Start webpack in watch mode
npm run dev

# In another terminal, start webpack dev server
npm run serve

# Open http://localhost:5175 to see index.html
```

### Production Build

```bash
npm run build
# Output: dist/widget.js (~40KB minified)
```

## Folder Structure

```
widget/
├── src/
│   ├── index.js          ← Main entry point
│   ├── api.js            ← Backend API calls
│   ├── storage.js        ← localStorage management
│   ├── styles.js         ← CSS styles
│   └── ui.js             ← UI component creation
├── dist/
│   └── widget.js         ← Built widget (after npm run build)
├── index.html            ← Test page
├── package.json
├── webpack.config.js
└── .babelrc             ← Babel configuration
```

## How It Works

### Installation on Website

User adds script to their website:

```html
<script
  src="https://lexioai.com/widget.js?key=EMBED_KEY"
  data-api-base="https://api.lexioai.com/api/v1"
></script>
```

That's it! Chat bubble appears on bottom-right corner.

### Flow

1. **Load** → Widget fetches bot config from backend
2. **Inject** → Creates chat bubble in Shadow DOM (CSS isolated)
3. **Interact** → User clicks bubble → chat window opens
4. **Message** → User sends message → AI responds
5. **Lead Capture** → Optional lead form
6. **Persist** → All data saved to localStorage

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/widget/:embedKey` | GET | Fetch bot configuration |
| `/api/v1/widget/:embedKey/chat` | POST | Send message, get response |
| `/api/v1/widget/:embedKey/lead` | POST | Submit lead form |

## Features

✅ **Floating Chat Bubble** - Bottom-right corner
✅ **Responsive** - Works on mobile, tablet, desktop
✅ **Shadow DOM** - CSS isolation from host website
✅ **Dark Mode** - Supports dark/light backgrounds
✅ **Lead Capture** - Collect visitor info
✅ **Persistence** - Conversation history saved
✅ **Custom Branding** - Bot color, avatar, name
✅ **Multi-language** - Auto language detection

## API Base URL Configuration

Widget API URL runtime pe configure hoti hai using script attribute:

```html
data-api-base="https://api.lexioai.com/api/v1"
```

If omitted, widget defaults to:

```text
http://localhost:5000/api/v1
```

## Testing

1. Start backend: `cd ../server && npm run dev`
2. Open `index.html` in browser
3. Look for chat bubble on bottom-right
4. Click and start chatting!
5. Check browser console (F12) for logs

## Build Size

- Unminified: ~120KB
- Minified: ~40KB
- Gzipped: ~15KB

## Notes

- Pure Vanilla JavaScript (no React/Vue)
- Works with any website/framework
- Embed key is public (for authentication)
- All CSS scoped to widget via Shadow DOM
- localStorage for persistence
- Credits can only be used by authenticated backend

## Troubleshooting

### Widget not appearing?

1. Check embed key is correct
2. Verify bot is `isLive: true` in admin panel
3. Check browser console for errors
4. Ensure backend is running on http://localhost:5000

### Messages not sending?

1. Check API endpoint is accessible
2. Verify backend CORS is configured
3. Check browser console network tab
4. Ensure bot has training data

### Style issues?

1. Shadow DOM should isolate CSS
2. If conflicts happen, check CSS specificity
3. Primary color should match bot settings

## Production Deployment

1. Build: `npm run build`
2. Upload `dist/widget.js` to CDN
3. Serve from: `https://cdn.lexioai.com/widget.js`
4. Users embed: `<script src="https://lexioai.com/widget.js?key=..."></script>`

---

**Last Updated:** March 31, 2026
**Status:** Production Ready
