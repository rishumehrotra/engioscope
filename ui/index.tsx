import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.output.css';
import './index.css';
import ReactModal from 'react-modal';
import ReactTooltip from 'react-tooltip';
import * as serviceWorker from './serviceWorker.js';
import App from './App.js';

ReactModal.setAppElement('#root');

const Index: React.FC = () => {
  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      if (mutations.every(m => m.addedNodes.length === 0)) return;
      ReactTooltip.rebuild();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, []);

  return (
    <>
      <ReactTooltip />
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
