/**
 * Narrow settings rail: effects level, font, language, and (bottom, round
 * button) the initial setup screen. Each button cycles through its options.
 */

import { useI18n } from '../../i18n/context';
import { LOCALES } from '../../i18n/messages';
import { usePreferences } from '../../preferences/context';
import { EFFECT_LEVELS, FONT_STYLES } from '../../preferences/preferences';

function nextOf<T>(options: readonly T[], current: T): T {
  const index = options.indexOf(current);
  return options[(index + 1) % options.length] ?? current;
}

const EFFECT_GLYPH = { full: '▓▓▓', lite: '▓▓░', off: '░░░' } as const;

export function Sidebar() {
  const { messages } = useI18n();
  const { preferences, update, reopenSetup } = usePreferences();
  const { settings } = messages;

  const effectValue = settings.effectLevels[preferences.effects];
  const fontValue = settings.fonts[preferences.font];
  const languageValue = settings.languageNames[preferences.locale];

  return (
    <nav className="sidebar" aria-label={settings.heading}>
      <div className="sidebar__logo" aria-hidden="true">
        ☾
      </div>

      <button
        type="button"
        className="sidebar__button"
        aria-label={settings.cycle(settings.effects, effectValue)}
        title={settings.cycle(settings.effects, effectValue)}
        onClick={() => update({ effects: nextOf(EFFECT_LEVELS, preferences.effects) })}
      >
        <span className="sidebar__glyph">{EFFECT_GLYPH[preferences.effects]}</span>
        <span className="sidebar__label">FX</span>
      </button>

      <button
        type="button"
        className="sidebar__button"
        aria-label={settings.cycle(settings.font, fontValue)}
        title={settings.cycle(settings.font, fontValue)}
        onClick={() => update({ font: nextOf(FONT_STYLES, preferences.font) })}
      >
        <span className={`sidebar__glyph sidebar__glyph--font-${preferences.font}`}>Aa</span>
        <span className="sidebar__label">{preferences.font === 'terminal' ? 'DOS' : 'MONO'}</span>
      </button>

      <button
        type="button"
        className="sidebar__button"
        aria-label={settings.cycle(settings.language, languageValue)}
        title={settings.cycle(settings.language, languageValue)}
        onClick={() => update({ locale: nextOf(LOCALES, preferences.locale) })}
      >
        <span className="sidebar__glyph">{preferences.locale.toUpperCase()}</span>
        <span className="sidebar__label">{settings.languageShort}</span>
      </button>

      <button
        type="button"
        className="sidebar__power"
        aria-label={settings.setup}
        title={settings.setup}
        onClick={reopenSetup}
      >
        {/* Drawn power symbol: the ⏻ glyph is missing from most fonts. */}
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M12 3v9M7 6.4a8 8 0 1 0 10 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
        </svg>
      </button>
    </nav>
  );
}
