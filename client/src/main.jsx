import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.css'
import App from './App.jsx'
// import "easymde/dist/easymde.min.css"; // Removed
import 'tippy.js/dist/tippy.css'; // Add Tippy.js base CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
