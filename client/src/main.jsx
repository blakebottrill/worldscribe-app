import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css'
import App from './App.jsx'
// import "easymde/dist/easymde.min.css"; // Removed
import 'tippy.js/dist/tippy.css'; // Add Tippy.js base CSS
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      // gcTime: 10 * 60 * 1000, // Example: garbage collect after 10 mins
      // retry: 1, // Example: retry failed requests once
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
)
