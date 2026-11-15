import { useId, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n/context';

interface DialogButtonProps {
  /** Visible button content. */
  readonly label: ReactNode;
  /** Accessible name when the label is only a symbol. */
  readonly ariaLabel?: string;
  readonly buttonClassName?: string;
  /** Dialog title. */
  readonly title: string;
  /** Extra class on the `<dialog>`, e.g. to widen it. */
  readonly dialogClassName?: string;
  readonly children: ReactNode;
}

/**
 * Button that opens a modal dialog (native `<dialog>`: focus trap, Escape to
 * close and top-layer rendering come from the browser). Clicking outside the
 * window also closes it. Used for help texts and secondary details such as
 * sources, so they do not take space on the main screen.
 */
export function DialogButton({ label, ariaLabel, buttonClassName, title, dialogClassName, children }: DialogButtonProps) {
  const { messages } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        aria-label={ariaLabel}
        title={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className={`dialog${dialogClassName ? ` ${dialogClassName}` : ''}`}
        aria-labelledby={titleId}
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
            <button type="button" className="icon-button" onClick={close} aria-label={messages.common.close} title={messages.common.close}>
              ✕
            </button>
          </div>
          <div className="box__body dialog__body">{children}</div>
        </div>
      </dialog>
    </>
  );
}

/** Round "i" button for the top-right corner of a section; opens its help. */
export function HelpButton({ section, paragraphs }: { section: string; paragraphs: readonly string[] }) {
  const { messages } = useI18n();
  return (
    <DialogButton label="i" ariaLabel={messages.common.help(section)} buttonClassName="icon-button icon-button--info" title={section}>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </DialogButton>
  );
}
