import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, ReactEventHandler, MouseEventHandler } from 'react';
import { Close } from './Icons.jsx';

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
};

const Drawer: React.FC<DrawerProps> = ({ children, isOpen = false, close, heading }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOpenState = usePrevious(isOpen);

  useEffect(() => {
    if (!previousOpenState && isOpen) {
      dialogRef.current?.showModal();
      dialogRef.current?.classList.remove('backdrop:opacity-0');
      dialogRef.current?.classList.add('backdrop:opacity-25');

      dialogRef.current?.classList.remove('translate-x-full');
      dialogRef.current?.classList.remove('translate-x-0');

      const bodyScroll = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${bodyScroll}px`;
    }
  }, [isOpen, previousOpenState]);

  const startClose = useCallback(() => {
    dialogRef.current?.classList.add('backdrop:opacity-0');
    dialogRef.current?.classList.remove('backdrop:opacity-25');

    dialogRef.current?.classList.add('translate-x-full');
    dialogRef.current?.classList.add('translate-x-0');

    dialogRef.current?.addEventListener(
      'transitionend',
      () => {
        dialogRef.current?.close();
        const bodyScroll = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        window.scrollTo(0, Number.parseInt(bodyScroll || '0', 10) * -1);
      },
      { once: true }
    );
  }, []);

  useEffect(() => {
    if (previousOpenState && !isOpen) {
      startClose();
    }
  }, [isOpen, previousOpenState, startClose]);

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
        'w-[600px] max-w-[80%] h-full max-h-full m-0',
        'translate-x-full duration-200 p-0',
      ].join(' ')}
      style={{ inset: 'unset', top: 0, right: 0 }}
      onClick={onClick}
      onCancel={onCancel}
    >
      <div className="h-full w-full">
        <div className="grid grid-flow-col grid-cols-[1fr_min-content] pl-4 pr-2 py-3 border-b border-gray-200">
          <h1 className="font-semibold text-xl">{heading}</h1>
          <button onClick={close} className="p-2 self-start">
            <Close />
          </button>
        </div>
        <div className="h-full">{children}</div>
      </div>
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

  const drawerProps = {
    close,
    isOpen,
  };

  return [Drawer, drawerProps, open, isOpen, close] as const;
};
