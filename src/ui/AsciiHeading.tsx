import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { usePreferences } from '../preferences/context';
import { renderBlockText } from './blockFont';

interface AsciiHeadingProps {
  readonly text: string;
  /** Heading level for the accessible text. */
  readonly level?: 1 | 2;
  /** Optional status line shown to the right, like a terminal banner. */
  readonly aside?: ReactNode;
}

/**
 * Section heading. With effects on it is drawn with block characters (screen
 * readers get the plain text; the art is hidden from them) and its font size
 * scales to the container width. With effects off (high legibility) it is
 * plain text.
 */
export function AsciiHeading({ text, level = 2, aside }: AsciiHeadingProps) {
  const { preferences } = usePreferences();
  const retro = preferences.effects === 'on';
  const lines = useMemo(() => (retro ? renderBlockText(text) : []), [text, retro]);
  const columns = lines[0]?.length ?? 1;
  const Tag = level === 1 ? 'h1' : 'h2';

  return (
    <div className="ascii-heading">
      <Tag className="ascii-heading__title">
        {retro ? (
          <>
            <span className="visually-hidden">{text}</span>
            {/* A span (not <pre>) keeps the heading content valid phrasing content. */}
            <span className="ascii-heading__art" aria-hidden="true" style={{ '--cols': columns } as CSSProperties}>
              {lines.join('\n')}
            </span>
          </>
        ) : (
          <span className="ascii-heading__plain">{text}</span>
        )}
      </Tag>
      {aside && <div className="ascii-heading__aside">{aside}</div>}
    </div>
  );
}
