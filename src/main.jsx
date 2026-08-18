import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {
  isAuthenticatedApiSmokeTestRequested,
  runAuthenticatedApiSmokeTest,
} from './auth/authenticatedApiSmokeTest.js';
import { startProductBrandsSmokeTest } from './auth/productBrandsSmokeTest.js';
import { startProductMasterSmokeTest } from './auth/productMasterSmokeTest.js';

// Arnés temporal Phase1-010B: sólo se ejecuta al abrir la aplicación con
// ?phase1-010b-smoke=1 y publica estados seguros y conteo, nunca tokens ni clientes.
if (isAuthenticatedApiSmokeTestRequested()) {
  void runAuthenticatedApiSmokeTest().then((result) => {
    console.info('Phase1-010B Real Dataverse Customer Smoke Test', result);
  }).catch(() => {
    console.error('Phase1-010B Real Dataverse Customer Smoke Test no pudo iniciarse.');
  });
}

// Arnés temporal Phase1-042: el trigger Product es independiente del Provider
// global y sólo publica el resumen sanitizado construido por el smoke-test.
void startProductMasterSmokeTest();

// Arnés temporal Phase1-075: consulta Brands de forma autenticada y directa,
// sin pasar por Product Provider Factory ni cambiar la fuente Product normal.
void startProductBrandsSmokeTest();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
