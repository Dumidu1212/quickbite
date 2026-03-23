// src/main.jsx
//
// Application entry point.
// StrictMode enables additional runtime warnings during development —
// it does NOT affect the production build.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
