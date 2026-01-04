import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Import the App component
import './style.css'; // Import the main CSS file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);