import React from 'react';
import { createRoot } from 'react-dom/client';
import ResApp from './ResApp.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ResApp />
  </React.StrictMode>
);
