import { useState } from 'react'
import {
  Copy, Check, ChevronDown, ChevronUp, ExternalLink,
  Globe, FileCode, ShoppingCart, Sparkles, Square, Hexagon,
  Atom, Triangle, Code2, CircleDot, Flame, Layers, Disc, Rocket, Grape,
  FileJson, Braces, Gem, Hash, Coffee, Container,
  Smartphone, Bug, Tag, Frame, CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../ui/Card'
import Button from '../ui/Button'

// Framework categories and their setup instructions
const FRAMEWORKS = [
  {
    category: 'Web Basics',
    items: [
      {
        id: 'html',
        name: 'HTML',
        icon: Globe,
        description: 'Any static HTML website',
        getInstructions: (code) => [
          { title: 'Open your HTML file', desc: 'Open the HTML file where you want the chatbot to appear (e.g., index.html).' },
          { title: 'Paste before </body>', desc: 'Add the following code just before the closing </body> tag:', code },
          { title: 'Save & refresh', desc: 'Save the file and refresh your browser. The chat widget will appear in the bottom-right corner.' },
        ],
      },
      {
        id: 'wordpress',
        name: 'WordPress',
        icon: FileCode,
        description: 'WordPress websites & blogs',
        getInstructions: (code) => [
          { title: 'Go to Theme Editor', desc: 'In WordPress Admin, go to Appearance → Theme File Editor → footer.php (or use a plugin like "Insert Headers and Footers").' },
          { title: 'Paste before </body>', desc: 'Add this code just before the closing </body> tag in footer.php:', code },
          { title: 'Save & verify', desc: 'Click "Update File" and visit your website. The chatbot should appear on all pages.' },
        ],
      },
      {
        id: 'shopify',
        name: 'Shopify',
        icon: ShoppingCart,
        description: 'Shopify stores',
        getInstructions: (code) => [
          { title: 'Open Theme Editor', desc: 'Go to Online Store → Themes → Actions → Edit Code.' },
          { title: 'Edit theme.liquid', desc: 'Open Layout → theme.liquid and paste this code before the closing </body> tag:', code },
          { title: 'Save', desc: 'Click Save. The chatbot will now appear on your entire Shopify store.' },
        ],
      },
      {
        id: 'wix',
        name: 'Wix',
        icon: Sparkles,
        description: 'Wix websites',
        getInstructions: (code) => [
          { title: 'Open Wix Settings', desc: 'Go to Settings → Custom Code (under Advanced).' },
          { title: 'Add custom code', desc: 'Click "+ Add Custom Code", paste this code:', code },
          { title: 'Configure placement', desc: 'Set "Place Code in" to "Body - end" and apply to "All pages". Click Apply.' },
        ],
      },
      {
        id: 'squarespace',
        name: 'Squarespace',
        icon: Square,
        description: 'Squarespace websites',
        getInstructions: (code) => [
          { title: 'Open Code Injection', desc: 'Go to Settings → Advanced → Code Injection.' },
          { title: 'Paste in Footer', desc: 'Paste this code in the "Footer" section:', code },
          { title: 'Save', desc: 'Click Save. The chatbot will appear on all pages.' },
        ],
      },
      {
        id: 'webflow',
        name: 'Webflow',
        icon: Hexagon,
        description: 'Webflow websites',
        getInstructions: (code) => [
          { title: 'Open Project Settings', desc: 'Go to Project Settings → Custom Code tab.' },
          { title: 'Paste in Footer Code', desc: 'Add this code in the "Footer Code" section:', code },
          { title: 'Publish', desc: 'Save and Publish your site. The chatbot will be live on all pages.' },
        ],
      },
    ],
  },
  {
    category: 'JavaScript Frameworks',
    items: [
      {
        id: 'react',
        name: 'React',
        icon: Atom,
        description: 'React (CRA / Vite)',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'Option A: Add to index.html',
            desc: 'Open public/index.html (CRA) or index.html (Vite) and paste before </body>:',
            code,
          },
          {
            title: 'Option B: Use useEffect hook',
            desc: 'Or add dynamically in your App.jsx or layout component:',
            code: `import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${widgetUrl}/widget.js';
    script.setAttribute('data-key', '${embedKey}');
    script.setAttribute('data-api-base', '${apiBase}');
    script.defer = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return (/* your app JSX */);
}`,
          },
          { title: 'Done!', desc: 'The chatbot widget will appear on your React app.' },
        ],
      },
      {
        id: 'nextjs',
        name: 'Next.js',
        icon: Triangle,
        description: 'Next.js (App Router / Pages Router)',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'App Router (app/layout.jsx)',
            desc: 'Add the Script component in your root layout:',
            code: `// app/layout.jsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${widgetUrl}/widget.js"
          data-key="${embedKey}"
          data-api-base="${apiBase}"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}`,
          },
          {
            title: 'Pages Router (_app.jsx)',
            desc: 'Or if using Pages Router, add in _app.jsx:',
            code: `// pages/_app.jsx
import Script from 'next/script';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Script
        src="${widgetUrl}/widget.js"
        data-key="${embedKey}"
        data-api-base="${apiBase}"
        strategy="lazyOnload"
      />
    </>
  );
}`,
          },
          { title: 'Deploy', desc: 'Deploy your Next.js app. The chatbot will load on all pages.' },
        ],
      },
      {
        id: 'vue',
        name: 'Vue.js',
        icon: Code2,
        description: 'Vue 2 / Vue 3',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          { title: 'Option A: index.html', desc: 'Add to public/index.html or index.html before </body>:', code },
          {
            title: 'Option B: App.vue mounted hook',
            desc: 'Or add dynamically in App.vue:',
            code: `// App.vue
<script setup>
import { onMounted, onUnmounted } from 'vue';

let scriptEl = null;

onMounted(() => {
  scriptEl = document.createElement('script');
  scriptEl.src = '${widgetUrl}/widget.js';
  scriptEl.setAttribute('data-key', '${embedKey}');
  scriptEl.setAttribute('data-api-base', '${apiBase}');
  scriptEl.defer = true;
  document.body.appendChild(scriptEl);
});

onUnmounted(() => {
  if (scriptEl) document.body.removeChild(scriptEl);
});
</script>`,
          },
        ],
      },
      {
        id: 'angular',
        name: 'Angular',
        icon: CircleDot,
        description: 'Angular 14+',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'Add to index.html',
            desc: 'Open src/index.html and paste before </body>:',
            code,
          },
          {
            title: 'Alternative: angular.json scripts',
            desc: 'Or add to angular.json (note: attributes won\'t work this way, use index.html method instead):',
            code: `// angular.json → projects → architect → build → options
"scripts": []
// ⚠️ Use the index.html method above for data attributes`,
          },
        ],
      },
      {
        id: 'svelte',
        name: 'Svelte / SvelteKit',
        icon: Flame,
        description: 'Svelte & SvelteKit',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'SvelteKit: app.html',
            desc: 'Open src/app.html and paste before </body>:',
            code,
          },
          {
            title: 'Svelte: onMount',
            desc: 'Or in your root +layout.svelte:',
            code: `<script>
  import { onMount } from 'svelte';
  onMount(() => {
    const s = document.createElement('script');
    s.src = '${widgetUrl}/widget.js';
    s.setAttribute('data-key', '${embedKey}');
    s.setAttribute('data-api-base', '${apiBase}');
    s.defer = true;
    document.body.appendChild(s);
  });
</script>`,
          },
        ],
      },
      {
        id: 'nuxt',
        name: 'Nuxt.js',
        icon: Layers,
        description: 'Nuxt 3',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'nuxt.config.ts',
            desc: 'Add to your nuxt.config.ts:',
            code: `// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: '${widgetUrl}/widget.js',
          'data-key': '${embedKey}',
          'data-api-base': '${apiBase}',
          defer: true,
        },
      ],
    },
  },
});`,
          },
        ],
      },
      {
        id: 'remix',
        name: 'Remix',
        icon: Disc,
        description: 'Remix framework',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'app/root.tsx',
            desc: 'Add the script tag in your root.tsx before </body>:',
            code: `// app/root.tsx — inside the <body> tag
<script
  src="${widgetUrl}/widget.js"
  data-key="${embedKey}"
  data-api-base="${apiBase}"
  defer
/>`,
          },
        ],
      },
      {
        id: 'astro',
        name: 'Astro',
        icon: Rocket,
        description: 'Astro framework',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'Base layout',
            desc: 'Add to your base layout (e.g., src/layouts/Layout.astro) before </body>:',
            code,
          },
        ],
      },
      {
        id: 'gatsby',
        name: 'Gatsby',
        icon: Grape,
        description: 'Gatsby framework',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'gatsby-ssr.js',
            desc: 'Add to gatsby-ssr.js:',
            code: `// gatsby-ssr.js
import React from 'react';

export const onRenderBody = ({ setPostBodyComponents }) => {
  setPostBodyComponents([
    <script
      key="lexioai-widget"
      src="${widgetUrl}/widget.js"
      data-key="${embedKey}"
      data-api-base="${apiBase}"
      defer
    />,
  ]);
};`,
          },
        ],
      },
    ],
  },
  {
    category: 'Backend / Full-Stack',
    items: [
      {
        id: 'php',
        name: 'PHP',
        icon: FileJson,
        description: 'PHP / Laravel / CodeIgniter',
        getInstructions: (code) => [
          { title: 'Add to your layout', desc: 'In your main layout/template file, paste before </body>:', code },
          { title: 'Laravel', desc: 'For Laravel, add to resources/views/layouts/app.blade.php before </body>.' },
          { title: 'CodeIgniter', desc: 'For CodeIgniter, add to application/views/templates/footer.php.' },
        ],
      },
      {
        id: 'python',
        name: 'Python',
        icon: Braces,
        description: 'Django / Flask / FastAPI',
        getInstructions: (code) => [
          { title: 'Django', desc: 'Add to your base template (base.html) before </body>:', code },
          { title: 'Flask', desc: 'Add to templates/layout.html before </body>.' },
          { title: 'FastAPI', desc: 'If serving HTML via Jinja2, add to your base template before </body>.' },
        ],
      },
      {
        id: 'ruby',
        name: 'Ruby on Rails',
        icon: Gem,
        description: 'Rails applications',
        getInstructions: (code) => [
          { title: 'Application layout', desc: 'Add to app/views/layouts/application.html.erb before </body>:', code },
        ],
      },
      {
        id: 'dotnet',
        name: '.NET / Blazor',
        icon: Hash,
        description: 'ASP.NET / Blazor / Razor Pages',
        getInstructions: (code) => [
          { title: 'Shared layout', desc: 'For MVC: Add to Views/Shared/_Layout.cshtml before </body>.', code },
          { title: 'Blazor', desc: 'For Blazor: Add to wwwroot/index.html (WASM) or Pages/_Host.cshtml (Server).' },
        ],
      },
      {
        id: 'java',
        name: 'Java',
        icon: Coffee,
        description: 'Spring Boot / JSP / Thymeleaf',
        getInstructions: (code) => [
          { title: 'Thymeleaf layout', desc: 'Add to your Thymeleaf layout template before </body>:', code },
          { title: 'JSP', desc: 'For JSP, add to your footer include file before </body>.' },
        ],
      },
      {
        id: 'go',
        name: 'Go',
        icon: Container,
        description: 'Go / Gin / Echo',
        getInstructions: (code) => [
          { title: 'HTML templates', desc: 'Add to your base HTML template before </body>:', code },
        ],
      },
    ],
  },
  {
    category: 'Mobile & Other',
    items: [
      {
        id: 'reactnative',
        name: 'React Native (WebView)',
        icon: Smartphone,
        description: 'React Native apps',
        getInstructions: (_, embedKey, widgetUrl, apiBase) => [
          {
            title: 'WebView integration',
            desc: 'Use react-native-webview to embed the chatbot:',
            code: `import { WebView } from 'react-native-webview';

const ChatWidget = () => (
  <WebView
    source={{ html: \`
      <html><body>
        <script
          src="${widgetUrl}/widget.js"
          data-key="${embedKey}"
          data-api-base="${apiBase}"
          defer>
        </script>
      </body></html>
    \` }}
    style={{ flex: 1 }}
  />
);`,
          },
        ],
      },
      {
        id: 'flutter',
        name: 'Flutter (WebView)',
        icon: Bug,
        description: 'Flutter apps',
        getInstructions: (_, embedKey, widgetUrl, apiBase) => [
          {
            title: 'webview_flutter package',
            desc: 'Use webview_flutter to embed:',
            code: `// Add webview_flutter to pubspec.yaml
// Then in your widget:
WebView(
  initialUrl: Uri.dataFromString(
    '<html><body>'
    '<script src="${widgetUrl}/widget.js" '
    'data-key="${embedKey}" '
    'data-api-base="${apiBase}" defer></script>'
    '</body></html>',
    mimeType: 'text/html',
  ).toString(),
  javascriptMode: JavascriptMode.unrestricted,
)`,
          },
        ],
      },
      {
        id: 'gtm',
        name: 'Google Tag Manager',
        icon: Tag,
        description: 'Via GTM container',
        getInstructions: (code) => [
          { title: 'Create new Tag', desc: 'In GTM, go to Tags → New → Custom HTML.' },
          { title: 'Paste the code', desc: 'Paste this code as the Custom HTML:', code },
          { title: 'Set trigger', desc: 'Set trigger to "All Pages" and publish the container.' },
        ],
      },
      {
        id: 'iframe',
        name: 'iFrame Embed',
        icon: Frame,
        description: 'Embed as inline iframe',
        getInstructions: (_, embedKey, widgetUrl, apiBase) => [
          {
            title: 'Use iframe',
            desc: 'Embed the chatbot as a fixed-size iframe (for inline chat windows):',
            code: `<iframe
  src="${widgetUrl}/chat.html?key=${embedKey}&api=${encodeURIComponent(apiBase)}"
  width="400"
  height="600"
  frameborder="0"
  style="border: 1px solid #e0e0e0; border-radius: 12px;"
></iframe>`,
          },
          { title: 'Note', desc: 'The script embed method (shown above) is recommended for floating chat widgets.' },
        ],
      },
    ],
  },
]

function CodeBlock({ code, onCopy }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  return (
    <div className="relative group mt-2 mb-3">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition opacity-0 group-hover:opacity-100"
        title="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

export default function EmbedSetupGuide({ bot }) {
  const [activeFramework, setActiveFramework] = useState('html')
  const [expandedCategory, setExpandedCategory] = useState('Web Basics')

  const embedKey = bot?.embedKey || 'YOUR_EMBED_KEY'
  const widgetUrl = import.meta.env.VITE_WIDGET_CDN_URL || 'https://lexioai.pages.dev'
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://lexioai-server.onrender.com/api/v1'

  const embedCode = `<script\n  src="${widgetUrl}/widget.js"\n  data-key="${embedKey}"\n  data-api-base="${apiBase}"\n  defer>\n</script>`

  // Find active framework data
  let activeData = null
  for (const cat of FRAMEWORKS) {
    const found = cat.items.find((f) => f.id === activeFramework)
    if (found) { activeData = found; break }
  }

  const instructions = activeData?.getInstructions?.(embedCode, embedKey, widgetUrl, apiBase) || []

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode)
    toast.success('Embed code copied!')
  }

  return (
    <div className="space-y-5">
      {/* Quick Copy Section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Your Embed Code</p>
          <Button onClick={handleCopyEmbed} className="px-3 py-1.5">
            <Copy size={14} /> Copy Code
          </Button>
        </div>
        <CodeBlock code={embedCode} />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Embed Key: <code className="bg-[var(--bg-soft)] px-2 py-0.5 rounded font-mono">{embedKey}</code>
        </p>
      </Card>

      {/* Framework Selector */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">Setup Guide — Choose Your Platform</p>

        {FRAMEWORKS.map((cat) => (
          <div key={cat.category} className="mb-3">
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-soft)] hover:bg-[var(--bg-soft)]/80 transition text-left"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {cat.category}
              </span>
              {expandedCategory === cat.category ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedCategory === cat.category && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2 px-1">
                {cat.items.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setActiveFramework(fw.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      activeFramework === fw.id
                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/5 shadow-sm'
                        : 'border-[var(--border)] hover:border-[var(--primary-500)]/30'
                    }`}
                  >
                    <fw.icon size={20} className={activeFramework === fw.id ? 'text-[var(--primary-500)]' : 'text-[var(--text-muted)]'} />
                    <p className="text-sm font-medium mt-1">{fw.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{fw.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Active Framework Instructions */}
      {activeData && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-500)]/10">
              <activeData.icon size={18} className="text-[var(--primary-500)]" />
            </span>
            <div>
              <p className="text-sm font-semibold">{activeData.name} Setup Guide</p>
              <p className="text-xs text-[var(--text-muted)]">{activeData.description}</p>
            </div>
          </div>

          <div className="space-y-5">
            {instructions.map((step, idx) => (
              <div key={idx} className="relative pl-8">
                <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-[var(--primary-500)] text-white text-xs flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{step.desc}</p>
                  {step.code && <CodeBlock code={step.code} />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Verify Installation */}
      <Card className="p-5 border-[var(--primary-500)]/20 bg-[var(--primary-500)]/5">
        <p className="text-sm font-semibold">✅ After Installation</p>
        <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Visit your website and look for the chat bubble (bottom-right corner)</li>
          <li>• Click the bubble to open the chat window</li>
          <li>• Send a test message to verify the bot responds</li>
          <li>• Use the "Verify Live" button above to auto-detect installation</li>
        </ul>
      </Card>
    </div>
  )
}
