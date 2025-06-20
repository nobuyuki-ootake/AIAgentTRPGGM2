import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 開発環境でのStrictModeを有効化
const StrictModeWrapper = import.meta.env.DEV 
  ? React.StrictMode 
  : React.Fragment;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictModeWrapper>
    <App />
  </StrictModeWrapper>
);