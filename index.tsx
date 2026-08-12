import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root non trovato.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <App />
    </IconContext.Provider>
  </React.StrictMode>
);
