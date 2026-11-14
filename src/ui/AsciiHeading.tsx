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
 * Section heading. It renders both forms and CSS picks one (`data-font` on
 * the root, see styles.css): block characters in the retro look, or the plain
 * text in the high-visibility font of the low performance mode. The plain text
 * is always in the DOM, so screen readers read the same heading either way;
 * the art is hidden from them. The block art scales to the container width and
 * the plain text keeps its height, so switching modes does not move the layout.
 */
export function AsciiHeading({ text, level = 2, aside }: AsciiHeadingProps) {
  const lines = useMemo(() => renderBlockText(text), [text]);
  const columns = lines[0]?.length ?? 1;
  const Tag = level === 1 ? 'h1' : 'h2';

  return (
    <div className="ascii-heading">
      <Tag className="ascii-heading__title" style={{ '--cols': columns } as CSSProperties}>
        <span className="ascii-heading__text">{text}</span>
        {/* A span (not <pre>) keeps the heading content valid phrasing content. */}
        <span className="ascii-heading__art" aria-hidden="true">
          {lines.join('\n')}
        </span>
      </Tag>
      {aside && <div className="ascii-heading__aside">{aside}</div>}
    </div>
  );
}
