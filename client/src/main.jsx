import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

if (!localStorage.getItem('theme')) {
  document.documentElement.classList.add('dark')
  localStorage.setItem('theme', 'dark')
} else if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.classList.add('dark')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#171723',
            color: '#ededf7',
            border: '1px solid #2a2a3b',
          },
        }}
      />
    </QueryClientProvider>
  </BrowserRouter>,
)
