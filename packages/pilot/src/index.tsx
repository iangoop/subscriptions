import React from 'react';
import ReactDOM from 'react-dom/client';

import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap/dist/js/bootstrap.min.js';
import './index.scss';
import App from './App';
import './i18n/config.ts';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
