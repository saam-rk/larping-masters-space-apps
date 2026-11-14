import type { ElementType, ReactNode } from 'react';
import { HelpButton } from './DialogButton';

interface BoxProps {
  readonly title: string;
  /** Short tag at the right end of the title rule, e.g. `[3]` or `[OFFLINE]`. */
  readonly tag?: ReactNode;
  readonly tagTone?: 'accent' | 'warning' | 'error' | 'muted';
  /** Extra controls in the title rule, before the help button (e.g. a "Sources" button). */
  readonly actions?: ReactNode;
  /** Help paragraphs; when present, an "i" button opens them in a dialog. */
  readonly help?: readonly string[];
  readonly as?: ElementType;
  readonly titleAs?: 'h2' | 'h3';
  /** id for the title, e.g. to label a group inside the box. */
  readonly titleId?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Square terminal box with its title set into the top border:
 * `┌ TITLE ───────── [tag] (i) ┐`.
 */
export function Box({
  title,
  tag,
  tagTone = 'accent',
  actions,
  help,
  as: Tag = 'section',
  titleAs: Title = 'h2',
  titleId,
  className,
  children,
}: BoxProps) {
  return (
    <Tag className={`box${className ? ` ${className}` : ''}`}>
      <div className="box__head">
        <Title className="box__title" id={titleId}>
          {title}
        </Title>
        <span className="box__rule" aria-hidden="true" />
        {tag && <span className={`box__tag box__tag--${tagTone}`}>{tag}</span>}
        {actions}
        {help && <HelpButton section={title} paragraphs={help} />}
      </div>
      <div className="box__body">{children}</div>
    </Tag>
  );
}
