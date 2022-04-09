import React from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.output.css';
import './index.css';
import ReactModal from 'react-modal';
import App from './App';
import * as serviceWorker from './serviceWorker';

ReactModal.setAppElement('#root');

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
