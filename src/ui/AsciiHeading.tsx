import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { renderBlockText } from './blockFont';

interface AsciiHeadingProps {
  readonly text: string;
  /** Heading level for the accessible text. */
  readonly level?: 1 | 2;
  /** Optional status line shown to the right, like a terminal banner. */
  readonly aside?: ReactNode;
}

/**
 * Large heading drawn with block characters. Screen readers get the plain
 * text; the art is hidden from them. Font size scales to the container width.
 */
export function AsciiHeading({ text, level = 2, aside }: AsciiHeadingProps) {
  const lines = useMemo(() => renderBlockText(text), [text]);
  const columns = lines[0]?.length ?? 1;
  const Tag = level === 1 ? 'h1' : 'h2';

  return (
    <div className="ascii-heading">
      <Tag className="ascii-heading__title">
        <span className="visually-hidden">{text}</span>
        {/* A span (not <pre>) keeps the heading content valid phrasing content. */}
        <span className="ascii-heading__art" aria-hidden="true" style={{ '--cols': columns } as CSSProperties}>
          {lines.join('\n')}
        </span>
      </Tag>
      {aside && <div className="ascii-heading__aside">{aside}</div>}
    </div>
  );
}
