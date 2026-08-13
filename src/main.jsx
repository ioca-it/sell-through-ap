import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {
  isAuthenticatedApiSmokeTestRequested,
  runAuthenticatedApiSmokeTest,
} from './auth/authenticatedApiSmokeTest.js';

// Arnés temporal Phase1-007: sólo se ejecuta al abrir la aplicación con
// ?phase1-007-smoke=1 y publica estados seguros, nunca tokens ni respuestas completas.
if (isAuthenticatedApiSmokeTestRequested()) {
  void runAuthenticatedApiSmokeTest().then((result) => {
    console.info('Phase1-007 Authenticated API Smoke Test', result);
  }).catch(() => {
    console.error('Phase1-007 Authenticated API Smoke Test no pudo iniciarse.');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
