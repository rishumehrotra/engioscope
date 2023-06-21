import React from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.output.css';
import './index.css';
import ReactModal from 'react-modal';
import { Tooltip } from 'react-tooltip';
import * as serviceWorker from './serviceWorker.js';
import App from './App.js';

ReactModal.setAppElement('#root');

const Index: React.FC = () => {
  return (
    <>
      <Tooltip
        id="react-tooltip"
        className="z-50 text-base"
        style={{ borderRadius: '0.375rem', fontSize: '0.875rem', lineHeight: '1.25rem' }}
      />
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.querySelector('#root')!).render(<Index />);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
