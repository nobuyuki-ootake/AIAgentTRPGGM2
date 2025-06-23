import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 開発環境でのStrictModeを有効化
const StrictModeWrapper = import.meta.env.DEV 
  ? React.StrictMode 
  : React.Fragment;

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <StrictModeWrapper>
    <App />
  </StrictModeWrapper>,
);