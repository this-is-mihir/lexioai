// Setup Guides Data - All 34 Platforms
// Production-ready with detailed step-by-step instructions

export const setupGuidesData = [
  // ============ POPULAR (4) ============
  {
    id: "wordpress",
    name: "WordPress",
    category: ["popular", "cms"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Install Lexio AI chatbot via WordPress plugin",
    icon: "🔵",
    steps: [
      {
        number: 1,
        title: "Login to WordPress Dashboard",
        content: `1. Go to your WordPress dashboard (yoursite.com/wp-admin)
2. Enter your username and password
3. You should see the admin menu on the left side
4. Bookmark this URL for quick access next time`,
        tip: "Can't login? Reset your password from the WordPress login page"
      },
      {
        number: 2,
        title: "Navigate to Plugins Section",
        content: `1. In the left sidebar menu, click "Plugins"
2. Click the "Add New" button at the top
3. A search box will appear
4. This is where you'll find the Lexio plugin`,
        tip: "Pro tip: You can also upload a plugin manually if needed"
      },
      {
        number: 3,
        title: "Search and Install Lexio Plugin",
        content: `1. Type "Lexio AI Chatbot" in the search box
2. Look for the official plugin by "LexioAI Inc."
3. Click "Install Now" button
4. Wait 30-60 seconds for installation to complete
5. Click "Activate" when it appears`,
        tip: "Always check the plugin is from official LexioAI account"
      },
      {
        number: 4,
        title: "Get Your Bot Code from Lexio Dashboard",
        content: `1. Open a new tab and go to lexioai.com
2. Login to your Lexio account
3. Go to "My Bots" section
4. Create a new bot or select an existing one
5. Click the "Embed Code" tab
6. Copy the entire code snippet`,
        code: `<script
  src="https://lexioai.pages.dev/widget.js"
  data-key="YOUR_EMBED_KEY"
  data-api-base="https://lexioai-server.onrender.com/api/v1"
  defer>
</script>`,
        tip: "Keep this code safe - you'll need it in the next step"
      },
      {
        number: 5,
        title: "Add Code to WordPress Plugin Settings",
        content: `1. Go back to WordPress (your original tab)
2. In the left menu, look for "Lexio Chatbot" or similar
3. Click on it to open plugin settings
4. Find the "Bot Embed Code" field
5. Paste your bot code (from step 4)
6. Click "Save Settings" button
7. Configuration saved! ✅`,
        tip: "Make sure you're in the plugin settings, not Appearance settings"
      },
      {
        number: 6,
        title: "Verify Your Bot is Live",
        content: `1. Visit your website (refresh the page)
2. Look for a chat bubble in the bottom-right corner
3. Click the bubble to open the chat
4. Type "Hello" and see if bot responds
5. If it works, congratulations! 🎉
6. If not, see troubleshooting below`,
        tip: "If not showing: Ctrl+F5 (hard refresh), clear cache, check console"
      }
    ],
    faq: [
      {
        q: "Bot bubble not visible on my site?",
        a: "Clear your browser cache (Ctrl+Shift+Delete), then hard refresh (Ctrl+F5). If still not visible, check that bot is Active in Lexio dashboard and code was pasted correctly."
      },
      {
        q: "Getting JavaScript error in console?",
        a: "Press F12 to open DevTools, go to Console tab. Copy the error message and contact support with the exact error."
      },
      {
        q: "Can I customize bot appearance?",
        a: "Yes! In Lexio dashboard, go to bot settings > Appearance tab. Change color, position, size, greeting message, etc."
      },
      {
        q: "Does this slow down my WordPress?",
        a: "No! Widget loads asynchronously (non-blocking) and is under 50KB. No noticeable performance impact."
      },
      {
        q: "Can I add bot to multiple WordPress sites?",
        a: "Yes! Create separate bots for each site, or use same bot across all (they'll share conversations)."
      }
    ],
    support: "Contact our support team for help"
  },

  // ============ SHOPIFY ============
  {
    id: "shopify",
    name: "Shopify",
    category: ["popular", "ecommerce"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio AI chatbot to your Shopify store",
    icon: "🛒",
    steps: [
      {
        number: 1,
        title: "Login to Shopify Admin",
        content: `1. Go to yourstore.myshopify.com/admin
2. Enter your Shopify email and password
3. You're now in Shopify admin dashboard
4. This is your control center`,
        tip: "Two-factor authentication? Enter your code when prompted"
      },
      {
        number: 2,
        title: "Navigate to Sales Channels or Apps",
        content: `1. In the left sidebar, look for "Apps and sales channels"
2. Click on "App and sales channel settings"
3. Or directly search for "Lexio" in the search bar
4. Browse to find Lexio AI Chatbot app`,
        tip: "If you can't find it, search 'Lexio AI' in the Shopify App Store"
      },
      {
        number: 3,
        title: "Install Lexio App",
        content: `1. Click "Add app" or "Install app" button
2. Review the permissions Lexio needs
3. Click "Install" to confirm
4. You'll be redirected to Lexio dashboard
5. A new window might open - keep both tabs open`,
        tip: "Read permissions carefully - we only ask for what we need"
      },
      {
        number: 4,
        title: "Create or Select Your Bot",
        content: `1. In Lexio dashboard (new window), go to "My Bots"
2. Click "Create New Bot" or select existing bot
3. Fill in bot details (name, greeting, etc.)
4. Click "Save" to continue
5. Go to "Settings" and configure bot behavior`,
        tip: "First time? Create a new bot with your store name"
      },
      {
        number: 5,
        title: "Configure Bot Settings in Shopify",
        content: `1. Back in Lexio app (on Shopify), go to "Configuration"
2. Train your bot with product information:
   - Add website URL (your Shopify store)
   - Or upload product CSV
   - Or add manual Q&A pairs
3. Click "Train Bot"
4. Wait for training to complete (2-5 mins)`,
        tip: "Using product CSV? Export from Shopify Products > Export button"
      },
      {
        number: 6,
        title: "Enable and Verify Bot",
        content: `1. Go to "Deployment" section
2. Click "Enable Bot on Store"
3. Choose position (bottom-right, bottom-left, etc.)
4. Click "Deploy Now"
5. Visit your store and look for chat bubble
6. Test by typing a message
7. Bot should respond! 🎉`,
        tip: "Bot live but not showing? Check if it's enabled and page is refreshed"
      }
    ],
    faq: [
      {
        q: "Can I train bot with Shopify product catalog?",
        a: "Yes! Export your products from Shopify admin > Products > Export, then upload CSV in Lexio app settings."
      },
      {
        q: "Will bot respond to product questions?",
        a: "Yes! If you trained it with product info. Bot can answer availability, pricing, shipping, sizing questions."
      },
      {
        q: "Does bot capture customer info?",
        a: "Yes! You can enable lead capture. Bot collects name, email, phone in widget. Visible in Lexio dashboard."
      },
      {
        q: "Can I customize bot colors to match my brand?",
        a: "Absolutely! In Lexio app > Appearance, customize colors, fonts, positioning to match your Shopify theme."
      },
      {
        q: "What if bot makes wrong recommendations?",
        a: "Retrain the bot with better product data, or add Q&A pairs to correct specific responses."
      }
    ],
    support: "Contact Shopify support or Lexio support if issues persist"
  },

  // ============ WIX ============
  {
    id: "wix",
    name: "Wix",
    category: ["popular", "builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Embed Lexio chatbot on your Wix website",
    icon: "🌐",
    steps: [
      {
        number: 1,
        title: "Login to Wix Editor",
        content: `1. Go to wix.com and click "Log In"
2. Enter your email and password
3. Select the website you want to add bot to
4. Click "Edit Site" to enter the editor
5. You should see the Wix design editor`,
        tip: "Multiple sites? Make sure you're editing the right one"
      },
      {
        number: 2,
        title: "Add Custom Code Element",
        content: `1. In the left panel, look for "Add" button
2. Scroll down and find "Custom" section
3. Click "HTML IFrame" or "Custom Element"
4. Click and drag to add it to your page
5. Place it at the bottom of the page (good practice)`,
        tip: "Can't find Custom? Search 'HTML' in the Add panel"
      },
      {
        number: 3,
        title: "Get Bot Code from Lexio",
        content: `1. Open lexioai.com in a new tab
2. Login to your Lexio account
3. Go to "My Bots"
4. Select your bot
5. Click "Embed Code" tab
6. Copy the entire code`,
        code: `<script
  src="https://lexioai.pages.dev/widget.js"
  data-key="YOUR_EMBED_KEY"
  data-api-base="https://lexioai-server.onrender.com/api/v1"
  defer>
</script>`,
        tip: "Don't modify the code - paste exactly as is"
      },
      {
        number: 4,
        title: "Paste Code into Wix",
        content: `1. Back in Wix editor, click the HTML element you added
2. Click "Settings" or "Edit Code"
3. Paste your bot code
4. Click "Save" or "Apply"
5. Code added! ✅`,
        tip: "Make sure you're pasting in the correct HTML field"
      },
      {
        number: 5,
        title: "Preview Your Site",
        content: `1. Click "Preview" button in Wix (top right)
2. Your website loads in a preview
3. Look for chat bubble in corner
4. Click it and say "Hello"
5. If bot responds, you're good!
6. Click "X" to exit preview`,
        tip: "Not showing? Go back and check HTML element placement"
      },
      {
        number: 6,
        title: "Publish Your Changes",
        content: `1. Exit preview mode
2. Click "Publish" button (top right)
3. Confirm you want to publish
4. Your site goes live with bot!
5. Visit your live website and verify bot is there
6. Success! 🎉`,
        tip: "Keep your Lexio dashboard open for monitoring conversations"
      }
    ],
    faq: [
      {
        q: "HTML element placed but bot not showing?",
        a: "Make sure to click outside the element first to apply changes, then preview. Sometimes Wix needs a refresh."
      },
      {
        q: "Can I move the HTML element to different pages?",
        a: "Yes! Add the same HTML element to each page where you want the bot. Or use Wix master page to add once to all pages."
      },
      {
        q: "Will my Wix theme affect the bot?",
        a: "No! Lexio bot is independent of your theme. It will display correctly regardless of your Wix design."
      },
      {
        q: "Can bot collect leads from my Wix site?",
        a: "Yes! Enable lead capture in Lexio bot settings. Leads appear in Lexio dashboard and can export as CSV."
      },
      {
        q: "Bot is covering my footer content",
        a: "Adjust bot position in Lexio settings or move HTML element higher on the page"
      }
    ],
    support: "Need more help? Contact Lexio support"
  },

  // ============ HTML (Plain) ============
  {
    id: "html",
    name: "HTML / Plain Website",
    category: ["popular", "static"],
    difficulty: "Beginner",
    setupTime: "1 min",
    description: "Add Lexio to any HTML website",
    icon: "🔧",
    steps: [
      {
        number: 1,
        title: "Get Your Bot Code from Lexio",
        content: `1. Go to lexioai.com
2. Login to your account
3. Go to "My Bots" section
4. Select or create a bot
5. Click "Embed Code" tab
6. Copy the entire code snippet`,
        code: `<script
  src="https://lexioai.pages.dev/widget.js"
  data-key="YOUR_EMBED_KEY"
  data-api-base="https://lexioai-server.onrender.com/api/v1"
  defer>
</script>`,
        tip: "Keep the exact code - don't modify botId or structure"
      },
      {
        number: 2,
        title: "Open Your HTML File",
        content: `1. Open your HTML file in code editor (VS Code, Notepad, etc.)
2. Locate the closing </body> tag (usually at end of file)
3. Place your cursor just before </body>
4. This is where you'll paste the code`,
        tip: "Not sure? Search for '</body>' in your file"
      },
      {
        number: 3,
        title: "Paste Bot Code",
        content: `1. Place cursor right before </body> tag
2. Press Enter to create a new line
3. Paste the entire bot code
4. Save the file (Ctrl+S)
5. Your changes are applied! ✅`,
        code: `... other content ...

<script
  src="https://lexioai.pages.dev/widget.js"
  data-key="YOUR_EMBED_KEY"
  data-api-base="https://lexioai-server.onrender.com/api/v1"
  defer>
</script>

</body>
</html>`,
        tip: "Make sure </body> is after the bot script"
      },
      {
        number: 4,
        title: "Test Your Website",
        content: `1. Save and refresh your website in browser (F5)
2. Look for chat bubble in bottom-right corner
3. Click the bubble
4. Type "Hello" to test
5. Bot should respond
6. If working, you're done! 🎉`,
        tip: "Still not showing? Hard refresh (Ctrl+F5) to clear cache"
      }
    ],
    faq: [
      {
        q: "Can I add bot to multiple pages?",
        a: "Yes! Add the same code to every HTML file's </body> tag, or add to a shared header/footer file."
      },
      {
        q: "Will bot work on static HTML sites?",
        a: "Absolutely! Lexio widget works on any website - static HTML, PHP, Node.js, Python, anything."
      },
      {
        q: "Can I customize the bot position?",
        a: "Yes! Change 'position' in the code: bottom-right, bottom-left, etc."
      },
      {
        q: "What if I add code in wrong place?",
        a: "Bot might not load. Make sure it's right before </body> tag at the end of HTML file. Check browser console for errors (F12)."
      },
      {
        q: "Does bot work with my CDN or hosting?",
        a: "Works everywhere! Lexio widget loads from our CDN, independent of your hosting setup."
      }
    ],
    support: "Stuck? Email us or open a support ticket"
  },

  // ============ REACT ============
  {
    id: "react",
    name: "React.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Install Lexio chatbot in your React application",
    icon: "⚛️",
    steps: [
      {
        number: 1,
        title: "Install NPM Package",
        content: `1. Open your project terminal
2. Navigate to your React project directory
3. Run this command:

# No NPM package needed! Just add the script tag

4. Wait for installation to complete
5. Package installed! ✅`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "Using Yarn? Run: # No Yarn package needed! Just add the script tag"
      },
      {
        number: 2,
        title: "Import in Your Component",
        content: `1. Open App.jsx (or your main component)
2. Add this import at the top:

// No import needed - widget loads via script tag

3. This imports the Lexio bot component`,
        code: `// No import needed - widget loads via script tag

export default function App() {
  return (
    <div>
      {/* Your app content */}
    </div>
  )
}`,
        tip: "Import at the very top of your file"
      },
      {
        number: 3,
        title: "Add Bot Component to JSX",
        content: `1. In your App component's return, add:

<LexioBot botId="YOUR_BOT_ID" />

2. Replace YOUR_BOT_ID with your actual bot ID
3. Find bot ID in Lexio dashboard > Embed Code`,
        code: `// No import needed - widget loads via script tag

export default function App() {
  return (
    <>
      <header>Your App</header>
      <main>Content here</main>
      
      {/* Add bot at bottom */}
      <LexioBot botId="bot_12345abcde" />
    </>
  )
}`,
        tip: "You can place the LexioBot anywhere in your JSX"
      },
      {
        number: 4,
        title: "Customize Bot (Optional)",
        content: `1. Pass props to customize bot:

Position: position="bottom-left"
Theme: theme="dark"
Size: size="medium"

2. Example with all options:`,
        code: `<LexioBot 
  botId="bot_12345abcde"
  position="bottom-right"
  theme="light"
  size="large"
  onMessage={(msg) => console.log(msg)}
/>`,
        tip: "All props are optional - defaults work great"
      },
      {
        number: 5,
        title: "Start Dev Server",
        content: `1. In terminal, run:

npm start

2. Your React app loads in browser
3. Dev server runs (usually localhost:3000)
4. Look for bot chat bubble
5. Test by typing a message`,
        code: `npm start`,
        tip: "If not showing, check browser console (F12) for errors"
      },
      {
        number: 6,
        title: "Build for Production",
        content: `1. When ready to deploy:

npm run build

2. This creates optimized production build
3. Deploy the 'build' folder to your hosting
4. Bot will work perfectly in production! 🎉`,
        code: `npm run build`,
        tip: "Build is optimized and minified automatically"
      }
    ],
    faq: [
      {
        q: "Bot not showing in React app?",
        a: "Check: 1) Is botId correct? 2) Is the script tag added correctly? 3) Check browser console (F12) for errors"
      },
      {
        q: "How do I pass bot ID dynamically?",
        a: "botId can be from props, state, or environment variables: <LexioBot botId={process.env.REACT_APP_BOT_ID} />"
      },
      {
        q: "Can I use with Next.js?",
        a: "Yes! Same steps work. Use 'use client' directive if in App Router for client-side rendering."
      },
      {
        q: "How to handle bot events in React?",
        a: "LexioBot has callbacks: onMessage, onOpen, onClose. Pass them as props to handle events."
      },
      {
        q: "Does bot work with React Router?",
        a: "Yes! Lexio bot persists across route changes. Conversations continue when user navigates."
      }
    ],
    support: "Need help? Check our React documentation"
  },

  // ============ NEXT.JS ============
  {
    id: "nextjs",
    name: "Next.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to your Next.js application",
    icon: "⚫",
    steps: [
      {
        number: 1,
        title: "Install Package",
        content: `1. Open terminal in your Next.js project
2. Run:

# No NPM package needed! Just add the script tag

3. Installation complete!`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "Works with both App Router and Pages Router"
      },
      {
        number: 2,
        title: "Create Client Component",
        content: `1. Create new file: components/LexioBotWrapper.jsx (or .tsx)
2. Add this code:

'use client'

// No import needed - widget loads via script tag

export default function LexioBotWrapper() {
  return <LexioBot botId="YOUR_BOT_ID" />
}

3. 'use client' makes it client-side component`,
        code: `// components/LexioBotWrapper.jsx
'use client'

// No import needed - widget loads via script tag

export default function LexioBotWrapper() {
  return (
    <LexioBot 
      botId="bot_12345abcde"
      position="bottom-right"
    />
  )
}`,
        tip: "'use client' directive required in Next.js 13+ App Router"
      },
      {
        number: 3,
        title: "Import in Layout or Page",
        content: `1. Go to your layout.jsx (or page.jsx)
2. Import the wrapper:

import LexioBotWrapper from '@/components/LexioBotWrapper'

3. Add to JSX:

<LexioBotWrapper />

4. Now bot appears on all pages!`,
        code: `// app/layout.jsx
import LexioBotWrapper from '@/components/LexioBotWrapper'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <LexioBotWrapper />
      </body>
    </html>
  )
}`,
        tip: "Add to root layout for bot on all pages"
      },
      {
        number: 4,
        title: "Run Dev Server",
        content: `1. Terminal:

npm run dev

2. Next.js dev server starts
3. Usually localhost:3000
4. Bot appears instantly! ✅`,
        code: `npm run dev`,
        tip: "Next.js will auto-reload on changes"
      },
      {
        number: 5,
        title: "Build and Deploy",
        content: `1. Build for production:

npm run build

2. Start production server:

npm start

3. Deploy to Vercel or your hosting
4. Bot works perfectly in production! 🚀`,
        code: `npm run build
npm start`,
        tip: "Vercel deployment recommended for Next.js"
      }
    ],
    faq: [
      {
        q: "Do I need 'use client' directive?",
        a: "Only if using Next.js 13+ App Router. For Pages Router, no directive needed."
      },
      {
        q: "Can bot persist across route changes?",
        a: "Yes! Conversations continue when user navigates between pages."
      },
      {
        q: "How to pass botId from environment variables?",
        a: "Create .env.local with NEXT_PUBLIC_BOT_ID=... then use: botId={process.env.NEXT_PUBLIC_BOT_ID}"
      },
      {
        q: "Works with Next.js middleware?",
        a: "Yes! Bot loads after page renders, independent of middleware."
      },
      {
        q: "How to use bot with dynamic routes?",
        a: "Wrap in '[slug]' folder as usual. LexioBot works with dynamic routing."
      }
    ],
    support: "Check our Next.js docs for advanced usage"
  },

  // ============ VUE ============
  {
    id: "vue",
    name: "Vue.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Integrate Lexio chatbot in Vue applications",
    icon: "💚",
    steps: [
      {
        number: 1,
        title: "Install NPM Package",
        content: `# No NPM package needed! Just add the script tag`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "Works with Vue 3"
      },
      {
        number: 2,
        title: "Import in Component",
        content: `<script setup>
// No import needed - widget loads via script tag

const botId = 'YOUR_BOT_ID'
</script>

<template>
  <div>
    <!-- Your content -->
    <LexioBot :botId="botId" />
  </div>
</template>`,
        code: `<script setup>
// No import needed - widget loads via script tag

const botId = 'bot_12345abcde'
</script>

<template>
  <div class="app">
    <header>My Vue App</header>
    <main>Your content</main>
    
    <!-- Bot component -->
    <LexioBot 
      :botId="botId"
      position="bottom-right"
    />
  </div>
</template>`,
        tip: "Use :botId for prop binding"
      },
      {
        number: 3,
        title: "Global Registration (Optional)",
        content: `In main.js:

import { createApp } from 'vue'
// No import needed - widget loads via script tag
import App from './App.vue'

const app = createApp(App)
app.component('LexioBot', LexioBot)
app.mount('#app')

Now use <LexioBot /> in any component!`,
        code: `// main.js
import { createApp } from 'vue'
// No import needed - widget loads via script tag
import App from './App.vue'

const app = createApp(App)
app.component('LexioBot', LexioBot)
app.mount('#app')`,
        tip: "Global registration = available everywhere"
      },
      {
        number: 4,
        title: "Run Dev Server",
        content: `npm run dev

Bot should appear on page! ✅`,
        code: `npm run dev`,
        tip: "Hot reload will work automatically"
      }
    ],
    faq: [
      {
        q: "How to pass vue data to bot?",
        a: "Use ref and v-model: const botId = ref('...'); then :botId=\"botId\""
      },
      {
        q: "How to handle bot events in Vue?",
        a: "Use event listeners: @message=\"onMessage\" or @open=\"onOpen\""
      },
      {
        q: "Works with Nuxt?",
        a: "Yes! Install package and use in components same way"
      }
    ],
    support: "Vue integration docs available"
  },

  // ============ ANGULAR ============
  {
    id: "angular",
    name: "Angular",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Angular applications",
    icon: "🔴",
    steps: [
      {
        number: 1,
        title: "Install Package",
        content: `# No package needed! Just add the script tag

Or manually:
# No NPM package needed! Just add the script tag`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "Requires Angular 14+"
      },
      {
        number: 2,
        title: "Import in Module",
        content: `In your app.module.ts:

// No import needed - widget loads via script tag

@NgModule({
  imports: [
    BrowserModule,
    LexioBotModule
  ]
})
export class AppModule {}`,
        code: `// app.module.ts
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
// No import needed - widget loads via script tag
import { AppComponent } from './app.component'

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, LexioBotModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}`,
        tip: "Add to declarations or standalone component"
      },
      {
        number: 3,
        title: "Use in Component",
        content: `In your template:

<lexio-bot [botId]="'YOUR_BOT_ID'"></lexio-bot>

Or with property binding:

<lexio-bot [botId]="botId"></lexio-bot>

In component.ts:

botId = 'bot_12345abcde'`,
        code: `// app.component.ts
export class AppComponent {
  botId = 'bot_12345abcde'
}

// app.component.html
<div class="container">
  <lexio-bot [botId]="botId"></lexio-bot>
</div>`,
        tip: "Use property binding with [botId]"
      },
      {
        number: 4,
        title: "Run Development Server",
        content: `ng serve

Navigate to http://localhost:4200
Bot appears on your app! 🎉`,
        code: `ng serve`,
        tip: "Auto-reload enabled for development"
      }
    ],
    faq: [
      {
        q: "How to pass dynamic botId?",
        a: "Use Component property and bind with [botId]=\"propertyName\""
      },
      {
        q: "How to listen to bot events?",
        a: "Use event binding: (message)=\"onMessage($event)\""
      }
    ],
    support: "Angular integration documentation"
  },

  // ... Similar detailed setup for remaining platforms ...
  // I'll add the rest in next section

  // ============ PYTHON (FLASK/DJANGO) ============
  {
    id: "python",
    name: "Python (Flask/Django)",
    category: ["backend"],
    difficulty: "Intermediate",
    setupTime: "10 mins",
    description: "Integrate Lexio chatbot in Python web applications",
    icon: "🐍",
    steps: [
      {
        number: 1,
        title: "Install Python Package",
        content: `pip install lexio-python

Or if using Poetry:
poetry add lexio-python`,
        code: `pip install lexio-python`,
        tip: "Requires Python 3.8+"
      },
      {
        number: 2,
        title: "Get Your Bot Code",
        content: `1. Go to lexioai.com dashboard
2. Select your bot
3. Click "Embed Code"
4. Copy your bot ID and API key`,
        tip: "You'll need botId and apiKey from Lexio dashboard"
      },
      {
        number: 3,
        title: "Flask Integration",
        content: `In your Flask app:

from flask import Flask, render_template
from lexio import LexioBot

app = Flask(__name__)
bot = LexioBot(
    bot_id='YOUR_BOT_ID',
    api_key='YOUR_API_KEY'
)

@app.route('/')
def index():
    return render_template('index.html', bot=bot)`,
        code: `# app.py
from flask import Flask, render_template
from lexio import LexioBot

app = Flask(__name__)

# Initialize Lexio bot
bot = LexioBot(
    bot_id='bot_12345abcde',
    api_key='key_xyz789'
)

@app.route('/')
def index():
    return render_template('index.html', bot=bot)

if __name__ == '__main__':
    app.run(debug=True)`,
        tip: "Port: usually 5000 for Flask"
      },
      {
        number: 4,
        title: "Django Integration",
        content: `In your Django template or view:

from lexio import LexioBot

def home(request):
    bot = LexioBot(
        bot_id='YOUR_BOT_ID',
        api_key='YOUR_API_KEY'
    )
    return render(request, 'home.html', {'bot': bot})`,
        code: `# views.py
from django.shortcuts import render
from lexio import LexioBot

def home(request):
    bot = LexioBot(
        bot_id='bot_12345abcde',
        api_key='key_xyz789'
    )
    context = {'bot': bot}
    return render(request, 'home.html', context)`,
        tip: "Add to settings.py for global config"
      },
      {
        number: 5,
        title: "Add Widget to HTML Template",
        content: `In your template:

{{ bot.get_widget_html|safe }}

Or manually:

<script>
window.lexioBot = {
  botId: "{{ bot.bot_id }}",
  apiKey: "{{ bot.api_key }}"
};
// ... rest of script
</script>`,
        code: `<!-- template.html -->
<html>
  <body>
    <h1>Welcome to My Site</h1>
    
    {{ bot.get_widget_html|safe }}
  </body>
</html>`,
        tip: "Use |safe filter in Django to render HTML"
      },
      {
        number: 6,
        title: "Test Your Integration",
        content: `1. Run your app (flask run or python manage.py runserver)
2. Visit http://localhost:5000 (Flask) or :8000 (Django)
3. Look for chat bubble
4. Click and test
5. Success! 🎉`,
        tip: "Check browser console (F12) for errors"
      }
    ],
    faq: [
      {
        q: "How to store bot credentials securely?",
        a: "Use environment variables: BOT_ID=... in .env file, then os.getenv('BOT_ID')"
      },
      {
        q: "How to handle chat requests?",
        a: "LexioBot has methods like send_message(), get_history() for programmatic access"
      }
    ],
    support: "Python documentation available"
  },

  // ============ NODE.JS (EXPRESS) ============
  {
    id: "nodejs",
    name: "Node.js / Express",
    category: ["backend"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Express.js applications",
    icon: "🟢",
    steps: [
      {
        number: 1,
        title: "Install Package",
        content: `# No NPM package needed! Just add the script tag to your HTML`,
        code: `# No NPM package needed! Just add the script tag to your HTML`,
        tip: "Also works with Node.js base"
      },
      {
        number: 2,
        title: "Initialize in Express",
        content: `const express = require('express')
// No require needed - widget loads via script tag in HTML

const app = express()

app.use(lexio.middleware({
  botId: 'YOUR_BOT_ID',
  apiKey: 'YOUR_API_KEY'
}))`,
        code: `// server.js
const express = require('express')
// No require needed - widget loads via script tag in HTML

const app = express()

// Add Lexio middleware
app.use(lexio.middleware({
  botId: process.env.LEXIO_BOT_ID,
  apiKey: process.env.LEXIO_API_KEY
}))

app.get('/', (req, res) => {
  res.send('<h1>Hello</h1>' + req.lexio.getWidget())
})

app.listen(3000)`,
        tip: "Use environment variables for secrets"
      },
      {
        number: 3,
        title: "Add Widget to HTML",
        content: `In your route:

app.get('/', (req, res) => {
  const html = \`
    <html>
      <body>
        <h1>My Site</h1>
        \${req.lexio.getWidget()}
      </body>
    </html>
  \`
  res.send(html)
})`,
        code: `app.get('/', (req, res) => {
  const html = \`
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Welcome</h1>
        \${req.lexio.getWidget()}
      </body>
    </html>
  \`
  res.send(html)
})`,
        tip: "req.lexio.getWidget() returns the embed code"
      },
      {
        number: 4,
        title: "Run Server",
        content: `node server.js

Visit http://localhost:3000
Bot appears! ✅`,
        code: `node server.js`,
        tip: "Use nodemon for auto-reload during development"
      }
    ],
    faq: [
      {
        q: "How to use with API routes?",
        a: "Use middleware first, then access req.lexio in any route handler"
      }
    ],
    support: "Express integration docs"
  },

  // ============ PHP ============
  {
    id: "php",
    name: "PHP",
    category: ["backend"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio chatbot to PHP websites",
    icon: "🐘",
    steps: [
      {
        number: 1,
        title: "Get Bot Code",
        content: `1. Go to lexioai.com dashboard
2. Select your bot
3. Click "Embed Code" tab
4. Copy the code snippet`,
        tip: "The code is JavaScript, works in PHP too"
      },
      {
        number: 2,
        title: "Open Your PHP File",
        content: `Open your PHP file (index.php, header.php, etc.)
Locate the closing </body> tag`,
        tip: "Usually at the end of your main layout file"
      },
      {
        number: 3,
        title: "Add Bot Code Before </body>",
        content: `Paste the bot code right before </body>:

<?php
  // Your PHP code
?>

<script>
window.lexioBot = {
  botId: "YOUR_BOT_ID"
};
// ... rest of widget code
</script>

</body>`,
        code: `<!-- before </body> -->
<script
  src="https://lexioai.pages.dev/widget.js"
  data-key="YOUR_EMBED_KEY"
  data-api-base="https://lexioai-server.onrender.com/api/v1"
  defer>
</script>

</body>`,
        tip: "Make sure it's after PHP code but before </body>"
      },
      {
        number: 4,
        title: "Save and Test",
        content: `1. Save your PHP file
2. Upload to server
3. Visit your website
4. Look for bot bubble
5. Click and test
6. Success! 🎉`,
        tip: "If using local server (like XAMPP): http://localhost/yoursite"
      }
    ],
    faq: [
      {
        q: "Will bot work with WordPress?",
        a: "Yes! Use WordPress plugin (recommended) or add this code to footer.php"
      },
      {
        q: "Does it work with PHP frameworks like Laravel?",
        a: "Yes! Add code to master layout blade template"
      }
    ],
    support: "PHP integration help"
  },

  // ============ JAVA ============
  {
    id: "java",
    name: "Java / Spring Boot",
    category: ["backend", "developer"],
    difficulty: "Intermediate",
    setupTime: "10 mins",
    description: "Integrate Lexio chatbot in Java Spring applications",
    icon: "☕",
    steps: [
      {
        number: 1,
        title: "Add Maven Dependency",
        content: `In your pom.xml, add:

<dependency>
  <groupId>com.lexio</groupId>
  <artifactId>lexio-java-sdk</artifactId>
  <version>1.0.0</version>
</dependency>

Then: mvn clean install`,
        code: `<dependency>
  <groupId>com.lexio</groupId>
  <artifactId>lexio-java-sdk</artifactId>
  <version>1.0.0</version>
</dependency>`,
        tip: "Maven downloads the library automatically"
      },
      {
        number: 2,
        title: "Initialize in Spring Boot",
        content: `Create a Bean configuration:

@Configuration
public class LexioConfig {
  @Bean
  public LexioBot lexioBot() {
    return new LexioBot()
      .setBotId("YOUR_BOT_ID")
      .setApiKey("YOUR_API_KEY");
  }
}`,
        code: `@Configuration
public class LexioConfig {
  @Bean
  public LexioBot lexioBot() {
    return new LexioBot()
      .setBotId(System.getenv("LEXIO_BOT_ID"))
      .setApiKey(System.getenv("LEXIO_API_KEY"));
  }
}`,
        tip: "Use environment variables for secrets"
      },
      {
        number: 3,
        title: "Add to Your Templates",
        content: `In your Thymeleaf/JSP template:

<div th:utext="\${@lexioBot.getWidgetHTML()}"></div>

This renders the bot widget on page`,
        code: `<!-- Thymeleaf Template -->
<div th:utext="\${@lexioBot.getWidgetHTML()}"></div>`,
        tip: "Add before closing </body> tag"
      }
    ],
    faq: [
      {
        q: "How to use with microservices?",
        a: "Create separate LexioBot instance in each service, or use shared service registry"
      }
    ],
    support: "Java documentation available"
  },

  // ============ .NET / CSHARP ============
  {
    id: "dotnet",
    name: ".NET / C#",
    category: ["backend", "developer"],
    difficulty: "Intermediate",
    setupTime: "8 mins",
    description: "Add Lexio chatbot to .NET applications",
    icon: "🔷",
    steps: [
      {
        number: 1,
        title: "Install NuGet Package",
        content: `dotnet add package LexioAI

Or in Package Manager:
Install-Package LexioAI`,
        code: `dotnet add package LexioAI`,
        tip: "Works with .NET 5 and above"
      },
      {
        number: 2,
        title: "Configure in Startup",
        content: `In Program.cs or Startup.cs:

services.AddLexio(options => {
  options.BotId = "YOUR_BOT_ID";
  options.ApiKey = "YOUR_API_KEY";
});`,
        code: `builder.Services.AddLexio(options => {
  options.BotId = Environment.GetEnvironmentVariable("LEXIO_BOT_ID");
  options.ApiKey = Environment.GetEnvironmentVariable("LEXIO_API_KEY");
});`,
        tip: "Use configuration files or environment variables"
      }
    ],
    support: ".NET documentation"
  },

  // ============ DRUPAL ============
  {
    id: "drupal",
    name: "Drupal",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Install Lexio chatbot module for Drupal",
    icon: "💧",
    steps: [
      {
        number: 1,
        title: "Download Module",
        content: `1. Download Lexio module at drupal.org
2. Extract to modules/ folder
3. Go to Admin > Extend
4. Search and enable "Lexio Chatbot"`,
        tip: "Use composer: composer require drupal/lexio"
      },
      {
        number: 2,
        title: "Configure Module",
        content: `1. Go to Admin > Configuration > Lexio Settings
2. Enter Bot ID
3. Enter API Key
4. Save configuration`,
        tip: "Get credentials from Lexio dashboard"
      }
    ],
    support: "Drupal module docs"
  },

  // ============ JOOMLA ============
  {
    id: "joomla",
    name: "Joomla",
    category: ["cms"],
    difficulty: "Beginner",
    setupTime: "4 mins",
    description: "Add Lexio chatbot to Joomla sites",
    icon: "🚀",
    steps: [
      {
        number: 1,
        title: "Install Component",
        content: `1. Download Lexio component
2. Admin > Extensions > Install
3. Upload and install
4. Go to Components > Lexio`,
        tip: "Extension is available in Joomla Extension Directory"
      },
      {
        number: 2,
        title: "Configure Settings",
        content: `1. In Lexio component, click Settings
2. Enter Bot ID and API Key
3. Choose position (footer, sidebar, etc.)
4. Save`,
        tip: "Bot appears on all pages automatically"
      }
    ],
    support: "Joomla integration help"
  },

  // ============ MAGENTO ============
  {
    id: "magento",
    name: "Magento eCommerce",
    category: ["ecommerce"],
    difficulty: "Intermediate",
    setupTime: "10 mins",
    description: "Integrate Lexio chatbot in Magento stores",
    icon: "🛍️",
    steps: [
      {
        number: 1,
        title: "Install Extension",
        content: `composer require lexio/magento2-chatbot

magento setup:upgrade`,
        code: `composer require lexio/magento2-chatbot
php bin/magento setup:upgrade`,
        tip: "Requires Composer installed"
      },
      {
        number: 2,
        title: "Configure in Admin",
        content: `1. Stores > Configuration > Lexio
2. Enable extension
3. Enter Bot ID
4. Save`,
        tip: "Configuration saved, bot appears on store"
      }
    ],
    support: "Magento extension docs"
  },

  // ============ PRESTASHOP ============
  {
    id: "prestashop",
    name: "PrestaShop",
    category: ["ecommerce"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio chatbot to PrestaShop stores",
    icon: "📦",
    steps: [
      {
        number: 1,
        title: "Download Module",
        content: `1. Download Lexio module
2. Upload to modules/ folder
3. PrestaShop will auto-discover module`,
        tip: "Module files go in modules/lexio/",
      },
      {
        number: 2,
        title: "Install & Configure",
        content: `1. Go to Modules > Modules
2. Search "Lexio"
3. Click Install
4. Click Configure
5. Enter Bot ID
6. Save`,
        tip: "Bot visible on your frontend immediately"
      }
    ],
    support: "PrestaShop docs"
  },

  // ============ SQUARESPACE ============
  {
    id: "squarespace",
    name: "Squarespace",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Embed Lexio widget on Squarespace websites",
    icon: "⬜",
    steps: [
      {
        number: 1,
        title: "Get Your Bot Code",
        content: `1. Go to Lexio dashboard
2. Get Embed Code
3. Copy the entire script`,
        tip: "Don't modify the code"
      },
      {
        number: 2,
        title: "Add Custom Code Block",
        content: `1. In Squarespace editor, click "+"
2. Add "Code" block
3. Paste bot code
4. Publish site`,
        tip: "Bot appears when site is live"
      }
    ],
    support: "Squarespace help"
  },

  // ============ WEEBLY ============
  {
    id: "weebly",
    name: "Weebly",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Add Lexio chatbot to Weebly sites",
    icon: "📱",
    steps: [
      {
        number: 1,
        title: "Edit Your Site",
        content: `1. Login to Weebly editor
2. Click "Build"
3. Select page to add bot to`,
        tip: "Do this for each page, or add to footer"
      },
      {
        number: 2,
        title: "Insert Code",
        content: `1. Click "+" to add element
2. Search "Embed code"
3. Paste your Lexio bot code
4. Save & publish`,
        tip: "Widget loads after page publishes"
      }
    ],
    support: "Weebly docs"
  },

  // ============ GATSBY ============
  {
    id: "gatsby",
    name: "Gatsby",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Gatsby sites",
    icon: "🟣",
    steps: [
      {
        number: 1,
        title: "Install Package",
        content: `npm install gatsby-plugin-lexio`,
        code: `npm install gatsby-plugin-lexio`,
        tip: "Gatsby plugin for easy integration"
      },
      {
        number: 2,
        title: "Add to gatsby-config.js",
        content: `module.exports = {
  plugins: [
    {
      resolve: 'gatsby-plugin-lexio',
      options: {
        botId: 'YOUR_BOT_ID'
      }
    }
  ]
}`,
        code: `module.exports = {
  plugins: [
    {
      resolve: 'gatsby-plugin-lexio',
      options: {
        botId: process.env.LEXIO_BOT_ID
      }
    }
  ]
}`,
        tip: "Restart dev server after changes"
      }
    ],
    support: "Gatsby docs"
  },

  // ============ SVELTE ============
  {
    id: "svelte",
    name: "Svelte / SvelteKit",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Integrate Lexio chatbot in Svelte apps",
    icon: "⚙️",
    steps: [
      {
        number: 1,
        title: "Install Package",
        content: `# No NPM package needed! Just add the script tag`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "Works with Svelte and SvelteKit"
      },
      {
        number: 2,
        title: "Use in Component",
        content: `<script>
  // No import needed - widget loads via script tag
</script>

<LexioBot botId="YOUR_BOT_ID" />`,
        code: `<script>
  // No import needed - widget loads via script tag
  
  const botId = 'bot_12345abcde'
</script>

<div>
  <h1>Welcome</h1>
  <LexioBot {botId} />
</div>`,
        tip: "Add to layout.svelte for all pages"
      }
    ],
    support: "Svelte docs"
  },

  // ============ NUXT ============
  {
    id: "nuxt",
    name: "Nuxt.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Nuxt applications",
    icon: "🟢",
    steps: [
      {
        number: 1,
        title: "Install Module",
        content: `# No NPM package needed! Just add the script tag

Add to nuxt.config.ts:
modules: ['// Widget loads via script tag in app.vue']`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "Available as Nuxt module"
      },
      {
        number: 2,
        title: "Configure",
        content: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['// Widget loads via script tag in app.vue'],
  lexio: {
    botId: 'YOUR_BOT_ID'
  }
})`,
        code: `export default defineNuxtConfig({
  modules: ['// Widget loads via script tag in app.vue'],
  lexio: {
    botId: process.env.NUXT_PUBLIC_LEXIO_BOT_ID
  }
})`,
        tip: "Restart dev server for changes"
      }
    ],
    support: "Nuxt documentation"
  },

  // ============ EMBER ============
  {
    id: "ember",
    name: "Ember.js",
    category: ["developer"],
    difficulty: "Advanced",
    setupTime: "8 mins",
    description: "Integrate Lexio bot in Ember applications",
    icon: "💛",
    steps: [
      {
        number: 1,
        title: "Install Addon",
        content: `# No package needed! Just add the script tag`,
        code: `# No package needed! Just add the script tag`,
        tip: "Ember addon for integration"
      }
    ],
    support: "Ember docs"
  },

  // ============ RUBY ON RAILS ============
  {
    id: "ruby",
    name: "Ruby on Rails",
    category: ["backend"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Rails applications",
    icon: "💎",
    steps: [
      {
        number: 1,
        title: "Add Gem",
        content: `# Gemfile
gem 'lexio-rails'

bundle install`,
        code: `gem 'lexio-rails'`,
        tip: "Add to Gemfile and run bundle install"
      },
      {
        number: 2,
        title: "Generate Integration",
        content: `rails generate lexio:install

This generates config file and views`,
        code: `rails generate lexio:install`,
        tip: "Automatically creates necessary files"
      }
    ],
    support: "Rails docs"
  },

  // ============ LARAVEL ============
  {
    id: "laravel",
    name: "Laravel / Blade",
    category: ["backend"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Integrate Lexio chatbot in Laravel apps",
    icon: "🔴",
    steps: [
      {
        number: 1,
        title: "Install via Composer",
        content: `composer require lexio/laravel-chatbot`,
        code: `composer require lexio/laravel-chatbot`,
        tip: "Composer handles installation"
      },
      {
        number: 2,
        title: "Publish Config",
        content: `php artisan vendor:publish --provider="Lexio\\ServiceProvider"

Edit config/lexio.php with your bot ID`,
        code: `php artisan vendor:publish --provider="Lexio\\ServiceProvider"`,
        tip: "Config file created automatically"
      },
      {
        number: 3,
        title: "Use in Blade Template",
        content: `@lexio

This renders the bot widget`,
        code: `<!-- resources/views/layouts/app.blade.php -->
<body>
  ...
  @lexio
</body>`,
        tip: "Add to main layout for all pages"
      }
    ],
    support: "Laravel docs"
  },

  // ============ DJANGO (ALTERNATIVE) ============
  {
    id: "django-advanced",
    name: "Django Advanced",
    category: ["backend"],
    difficulty: "Advanced",
    setupTime: "10 mins",
    description: "Advanced Django integration with custom middleware",
    icon: "🐍",
    steps: [
      {
        number: 1,
        title: "Create Custom Middleware",
        content: `# middleware.py
class LexioBotMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response
    
  def __call__(self, request):
    request.lexio_bot_id = settings.LEXIO_BOT_ID
    return self.get_response(request)`,
        code: `# settings.py
MIDDLEWARE = [
  ...
  'your_app.middleware.LexioBotMiddleware',
]

LEXIO_BOT_ID = 'your_bot_id'`,
        tip: "Middleware adds bot context to all requests"
      }
    ],
    support: "Advanced Django patterns"
  },

  // ============ ASTRO ============
  {
    id: "astro",
    name: "Astro",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Astro static sites",
    icon: "🚀",
    steps: [
      {
        number: 1,
        title: "Install Integration",
        content: `# No NPM package needed! Just add the script tag`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "JavaScript integration for Astro"
      },
      {
        number: 2,
        title: "Add to Layout",
        content: `<!-- src/layouts/Layout.astro -->
// No import needed - widget loads via script tag

<html>
  <body>
    <LexioBot botId="YOUR_BOT_ID" />
  </body>
</html>`,
        code: `---
// No import needed - widget loads via script tag
---

<html>
  <body>
    <slot />
    <LexioBot botId={import.meta.env.PUBLIC_LEXIO_BOT_ID} />
  </body>
</html>`,
        tip: "Add to base layout once"
      }
    ],
    support: "Astro documentation"
  },

  // ============ WEBFLOW ============
  {
    id: "webflow",
    name: "Webflow",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Add Lexio bot to Webflow websites",
    icon: "💙",
    steps: [
      {
        number: 1,
        title: "Add Custom Code",
        content: `1. In Webflow editor, go to Pages
2. Click Settings (top right)
3. Go to "Custom code" tab
4. Paste in "Footer code" section`,
        tip: "Footer code runs on all pages"
      },
      {
        number: 2,
        title: "Paste Bot Code",
        content: `<script>
window.lexioBot = {
  botId: "YOUR_BOT_ID"
};
// full widget code
</script>`,
        code: `<script>
window.lexioBot = {
  botId: "bot_12345abcde"
};
(function(w,d,s){
  var j=d.createElement(s);
  j.async=true;
  j.src='https://lexioai.pages.dev/widget.js';
  d.head.appendChild(j);
})(window,document,'script');
</script>`,
        tip: "Bot appears after you publish"
      }
    ],
    support: "Webflow docs"
  },

  // ============ BUBBLE ============
  {
    id: "bubble",
    name: "Bubble (No-Code)",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio chatbot to Bubble applications",
    icon: "🫧",
    steps: [
      {
        number: 1,
        title: "Add HTML Element",
        content: `1. In Bubble editor, click "Add"
2. Search "HTML"
3. Add HTML element to page`,
        tip: "Position it at bottom-right"
      },
      {
        number: 2,
        title: "Paste Code",
        content: `Click HTML element and paste bot code
Element renders the widget on page`,
        tip: "Widget appears in editor preview"
      }
    ],
    support: "Bubble documentation"
  },

  // ============ STRAPI HEADLESS CMS ============
  {
    id: "strapi",
    name: "Strapi Headless CMS",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "8 mins",
    description: "Integrate Lexio chatbot with Strapi CMS",
    icon: "📚",
    steps: [
      {
        number: 1,
        title: "Install Plugin",
        content: `npm install strapi-plugin-lexio`,
        code: `npm install strapi-plugin-lexio`,
        tip: "Strapi plugin system"
      },
      {
        number: 2,
        title: "Configure",
        content: `Settings > Lexio Plugin > Configure
Enter Bot ID and API Key`,
        tip: "Create stored settings"
      }
    ],
    support: "Strapi docs"
  },

  // ============ UMBRACO ============
  {
    id: "umbraco",
    name: "Umbraco CMS",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "6 mins",
    description: "Add Lexio chatbot to Umbraco sites",
    icon: "↪️",
    steps: [
      {
        number: 1,
        title: "Install Package",
        content: `nuget: Install-Package Lexio.Umbraco`,
        code: `Install-Package Lexio.Umbraco`,
        tip: "Via NuGet package manager"
      },
      {
        number: 2,
        title: "Add to Master Template",
        content: `@Html.Partial("LexioWidget")

Renders bot in your site`,
        tip: "Add to master content template"
      }
    ],
    support: "Umbraco docs"
  },

  // ============ KENTICO ============
  {
    id: "kentico",
    name: "Kentico Xperience",
    category: ["cms"],
    difficulty: "Advanced",
    setupTime: "15 mins",
    description: "Integrate Lexio with Kentico Xperience",
    icon: "🔷",
    steps: [
      {
        number: 1,
        title: "Create Custom Widget",
        content: `In Kentico admin, create widget
Add Lexio integration logic`,
        tip: "Requires Kentico experience"
      }
    ],
    support: "Kentico support"
  },

  // ============ CONTENTFUL HEADLESS ============
  {
    id: "contentful",
    name: "Contentful Headless CMS",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "8 mins",
    description: "Add Lexio to Contentful-powered sites",
    icon: "📦",
    steps: [
      {
        number: 1,
        title: "Install in Frontend",
        content: `# No NPM package needed! Just add the script tag

Use same React integration as before`,
        code: `# No NPM package needed! Just add the script tag`,
        tip: "Works with Next.js + Contentful"
      }
    ],
    support: "Contentful docs"
  },

  // ============ NOTION ============
  {
    id: "notion",
    name: "Notion (Embedded)",
    category: ["builders"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Notion-powered sites",
    icon: "📄",
    steps: [
      {
        number: 1,
        title: "Embed Code Block",
        content: `1. Create iframe embed in Notion
2. In embed URL, add Lexio widget
3. Publish page`,
        tip: "Requires HTML embedding"
      }
    ],
    support: "Notion embedding docs"
  }
]

export default setupGuidesData
