import React from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.output.css';
import './index.css';
import ReactModal from 'react-modal';
import * as serviceWorker from './serviceWorker.js';
import App from './App.js';

ReactModal.setAppElement('#root');

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.querySelector('#root')!).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
