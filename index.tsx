import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  const reloadKey = 'ercmed_preload_error_reload_once';
  const alreadyReloaded = sessionStorage.getItem(reloadKey) === '1';

  if (!alreadyReloaded) {
    sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
