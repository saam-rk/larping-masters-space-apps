import type { ElementType, ReactNode } from 'react';

interface BoxProps {
  readonly title: string;
  /** Short tag at the right end of the title rule, e.g. `[1]` or `[OFFLINE]`. */
  readonly tag?: ReactNode;
  readonly tagTone?: 'accent' | 'warning' | 'error' | 'muted';
  readonly as?: ElementType;
  readonly titleAs?: 'h2' | 'h3';
  /** id for the title, e.g. to label a group inside the box. */
  readonly titleId?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Square terminal box with its title set into the top border:
 * `┌ TITLE ───────── [tag] ┐`.
 */
export function Box({
  title,
  tag,
  tagTone = 'accent',
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
      </div>
      <div className="box__body">{children}</div>
    </Tag>
  );
}
