import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { Announcer } from './components/Announcer.tsx';
// Los colores de cada mood están en colores.css, con instrucciones para cambiarlos.
import './styles/colores.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Announcer>
      <App />
    </Announcer>
  </React.StrictMode>,
);
