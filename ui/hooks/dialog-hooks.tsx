import type { HTMLAttributes, MouseEventHandler, ReactEventHandler } from 'react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrevious } from './use-previous.jsx';

type DialogHookOptions = {
  isOpen: boolean;
  onClosed: () => void;
  onOpenStart: (dialog: HTMLDialogElement) => void;
  onCloseStart: (dialog: HTMLDialogElement) => void;
};

export const useDialog = ({
  isOpen,
  onClosed,
  onOpenStart,
  onCloseStart,
}: DialogHookOptions) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [animationState, setAnimationState] = useState<'open' | 'closing' | 'closed'>(
    'closed'
  );
  const previousOpenState = usePrevious(isOpen);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!(animationState === 'closed' && isOpen)) return;

    dialog.showModal();

    onOpenStart(dialog);

    const bodyScroll = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${bodyScroll}px`;
    setAnimationState('open');
  }, [animationState, isOpen, onOpenStart, previousOpenState]);

  const startClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setAnimationState('closing');

    onCloseStart(dialog);

    const onTransitionEnd = () => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      dialog.close();
      const bodyScroll = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      window.scrollTo(0, Number.parseInt(bodyScroll || '0', 10) * -1);
      setAnimationState('closed');
      onClosed();
      dialog.removeEventListener('transitionend', onTransitionEnd);
    };

    dialogRef.current.addEventListener('transitionend', onTransitionEnd, { once: true });
  }, [onCloseStart, onClosed]);

  useEffect(() => {
    const mustClose = animationState === 'open' && !isOpen;
    if (mustClose) {
      startClose();
    }
  }, [animationState, isOpen, previousOpenState, startClose]);

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

  return {
    ref: dialogRef,
    onClick,
    onCancel,
  } as HTMLAttributes<HTMLDialogElement>;
};

export const useDialogWithBackdrop = (options: DialogHookOptions) => {
  const backdropStyles =
    'backdrop:bg-theme-backdrop backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-200';
  return [
    useDialog({
      ...options,
      onOpenStart: dialog => {
        dialog.classList.add('backdrop:opacity-25');
        dialog.classList.remove('backdrop:opacity-0');
        options.onOpenStart(dialog);
      },
      onCloseStart: dialog => {
        dialog.classList.add('backdrop:opacity-0');
        dialog.classList.remove('backdrop:opacity-25');
        options.onCloseStart(dialog);
      },
    }),
    backdropStyles,
  ] as const;
};

export type DialogProps = {
  close: () => void;
  isOpen: boolean;
  onClosed: () => void;
};

export const createDialogHook = <T extends React.FC<DialogProps>>(component: T) => {
  return () => {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => {
      setIsOpen(true);
    }, []);
    const close = useCallback(() => {
      setIsOpen(false);
    }, []);

    const modalProps: DialogProps = useMemo(
      () => ({
        close,
        isOpen,
        onClosed: close,
      }),
      [close, isOpen]
    );

    return [component, modalProps, open, isOpen, close] as const;
  };
};
