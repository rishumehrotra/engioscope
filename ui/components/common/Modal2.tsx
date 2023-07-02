import type { MouseEventHandler, ReactEventHandler, ReactNode } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'react-feather';
import { twMerge } from 'tailwind-merge';
import { usePrevious } from '../../hooks/use-previous.jsx';

type Modal2Props = {
  close: () => void;
  isOpen: boolean;
  heading?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClosed: () => void;
};

const Modal2: React.FC<Modal2Props> = ({
  isOpen = false,
  close,
  children,
  heading,
  className,
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

    setTimeout(() => {
      dialogRef.current?.classList.remove('translate-y-0');
      dialogRef.current?.classList.remove('opacity-100');
    }, 0);

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
    const dialog = dialogRef.current;
    if (!dialog) return;

    const mustOpen = animationState === 'closed' && isOpen;
    if (mustOpen) {
      dialog.showModal();
      dialog.classList.add('backdrop:opacity-25');
      dialog.classList.remove('backdrop:opacity-0');

      dialog.classList.remove('hidden');
      dialog.classList.add('opacity-100');
      setTimeout(() => {
        dialog.classList.add('translate-y-0');
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
      className={twMerge(
        'backdrop:bg-theme-backdrop backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-200',
        `rounded-lg shadow-2xl m-auto hidden p-0 -translate-y-10 opacity-0 transition-all`,
        className
      )}
      onClick={onClick}
      onCancel={onCancel}
    >
      <div className="grid grid-flow-row grid-rows-[max-content_1fr] h-full">
        <header className="grid grid-flow-col grid-cols-[1fr_30px] pl-6 pr-3 py-4 items-center border-b border-theme-seperator">
          <h1 className="text-xl font-medium">{heading}</h1>

          <button onClick={close} className="text-theme-icon">
            <X size={24} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
};

export const useModal2 = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);
  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const modalProps = useMemo(
    () => ({
      close,
      isOpen,
      onClosed: close,
    }),
    [close, isOpen]
  );

  return [Modal2, modalProps, open, isOpen, close] as const;
};
