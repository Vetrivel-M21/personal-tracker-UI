import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { applyStoredTheme } from './utils/theme.js';

applyStoredTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
