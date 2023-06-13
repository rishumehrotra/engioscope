import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, ReactEventHandler, MouseEventHandler } from 'react';
import { Close, Download } from './Icons.jsx';

const usePrevious = <T,>(value: T) => {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};

type DrawerProps = {
  isOpen: boolean;
  close: () => void;
  heading?: ReactNode;
  children?: ReactNode;
  downloadUrl?: string;
  onClosed: () => void;
};

const Drawer: React.FC<DrawerProps> = ({
  children,
  isOpen = false,
  close,
  heading,
  downloadUrl,
  onClosed,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [animationState, setAnimationState] = useState<'open' | 'closing' | 'closed'>(
    'closed'
  );
  const previousOpenState = usePrevious(isOpen);

  const startClose = useCallback(() => {
    setAnimationState('closing');
    dialogRef.current?.classList.add('backdrop:opacity-0');
    dialogRef.current?.classList.remove('backdrop:opacity-25');

    dialogRef.current?.classList.add('translate-x-full');
    dialogRef.current?.classList.add('translate-x-0');

    const onTransitionEnd = () => {
      dialogRef.current?.close();
      dialogRef.current?.classList.add('hidden');
      const bodyScroll = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      window.scrollTo(0, Number.parseInt(bodyScroll || '0', 10) * -1);
      setAnimationState('closed');
      onClosed();
      dialogRef.current?.removeEventListener('transitionend', onTransitionEnd);
    };

    dialogRef.current?.addEventListener('transitionend', onTransitionEnd, { once: true });
  }, [onClosed]);

  useEffect(() => {
    const mustClose = animationState === 'open' && !isOpen;
    if (mustClose) {
      startClose();
    }
  }, [animationState, isOpen, previousOpenState, startClose]);

  useEffect(() => {
    const mustOpen = animationState === 'closed' && isOpen;
    if (mustOpen) {
      dialogRef.current?.showModal();
      dialogRef.current?.classList.add('backdrop:opacity-25');
      dialogRef.current?.classList.remove('backdrop:opacity-0');

      dialogRef.current?.classList.remove('hidden');
      setTimeout(() => {
        dialogRef.current?.classList.remove('translate-x-full');
        dialogRef.current?.classList.remove('translate-x-0');
      }, 0);

      const bodyScroll = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${bodyScroll}px`;
      setAnimationState('open');
    }
  }, [animationState, isOpen, previousOpenState]);

  const onClick = useCallback<MouseEventHandler<HTMLDialogElement>>(
    evt => {
      if (evt.target === dialogRef.current) {
        startClose();
      }
    },
    [startClose]
  );

  const onCancel = useCallback<ReactEventHandler<HTMLDialogElement>>(
    evt => {
      evt.preventDefault();
      startClose();
    },
    [startClose]
  );

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
    <dialog
      ref={dialogRef}
      className={[
        'backdrop:bg-gray-800 backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-200',
        'w-[700px] max-w-[80%] h-screen max-h-screen m-0',
        'translate-x-full duration-200 p-0 hidden',
        'grid grid-flow-row grid-rows-[auto_1fr]',
      ].join(' ')}
      style={{ inset: 'unset', top: 0, right: 0 }}
      onClick={onClick}
      onCancel={onCancel}
    >
      <div
        className={[
          'max-h-screen grid grid-flow-col grid-cols-[1fr_min-content_min-content]',
          'pl-4 pr-2 py-3 border-b border-gray-200 items-center',
        ].join(' ')}
      >
        <h1 className="font-semibold text-xl">{heading}</h1>
        <div>
          {/* eslint-disable-next-line no-constant-condition */}
          {downloadUrl && false ? (
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center link-text p-2 text-sm font-medium whitespace-nowrap"
            >
              <Download className="inline-block mr-2" />
              Download XLSX
            </a>
          ) : null}
        </div>
        <button onClick={close} className="p-2 self-start">
          <Close />
        </button>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </dialog>
  );
};

export const useDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);
  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const drawerProps = useMemo(
    () => ({
      close,
      isOpen,
      onClosed: close,
    }),
    [close, isOpen]
  );

  return [Drawer, drawerProps, open] as const;
};
