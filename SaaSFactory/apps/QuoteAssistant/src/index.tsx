import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css';

const root = document.getElementById('root');

if (root) {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error rendering the app:", error);
    root.innerHTML = "<h1>An error occurred while loading the application. Please check the console for more details.</h1>";
  }
} else {
  console.error("Root element not found");
}