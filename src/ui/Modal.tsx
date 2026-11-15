import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n/context';

interface ModalProps {
  /** Whether the window is shown; the owner keeps this state. */
  readonly open: boolean;
  /** Called when the window closes (✕, Escape, a click on the backdrop or `open` turning false). */
  readonly onClose: () => void;
  readonly title: string;
  /** Short tag at the right end of the title rule, like `Box`'s. */
  readonly tag?: ReactNode;
  /** Extra controls in the title rule, before the close button (e.g. an "i" help button). */
  readonly actions?: ReactNode;
  /** Extra class on the `<dialog>`, e.g. to widen it. */
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Controlled modal window on a native `<dialog>` (focus trap, Escape and
 * top-layer rendering come from the browser), styled like `DialogButton`'s.
 * Unlike `DialogButton`, the owner opens and closes it, so a form inside can
 * close it after an action. The content stays mounted while closed, so field
 * values and results survive closing and reopening.
 */
export function Modal({ open, onClose, title, tag, actions, className, children }: ModalProps) {
  const { messages } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className={`dialog${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      onClose={(event) => {
        // React also hands this handler the `close` of a nested dialog (e.g. an "i" help window); ignore those.
        if (event.target === event.currentTarget) onClose();
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on its backdrop.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog__window box">
        <div className="box__head">
          <h2 className="box__title" id={titleId}>
            {title}
          </h2>
          <span className="box__rule" aria-hidden="true" />
          {tag && <span className="box__tag box__tag--accent">{tag}</span>}
          {actions}
          <button type="button" className="icon-button" onClick={close} aria-label={messages.common.close} title={messages.common.close}>
            ✕
          </button>
        </div>
        <div className="box__body dialog__body">{children}</div>
      </div>
    </dialog>
  );
}
