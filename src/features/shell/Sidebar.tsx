/**
 * Narrow settings rail: visual effects switch (full / low performance),
 * language, and (bottom, round settings button) the landing window with the
 * preferences.
 */

import { useI18n } from '../../i18n/context';
import { LOCALES } from '../../i18n/messages';
import { usePreferences } from '../../preferences/context';

/**
 * Settings cog for a 24×24 box: square teeth around a ring with a hole
 * (even-odd fill), drawn here because icon fonts are not loaded.
 */
function cogPath(teeth: number, outer: number, inner: number, hole: number): string {
  const fmt = (value: number) => value.toFixed(2);
  const point = (radius: number, angle: number) => `${fmt(12 + Math.cos(angle) * radius)} ${fmt(12 + Math.sin(angle) * radius)}`;
  const step = (Math.PI * 2) / teeth;
  const half = step * 0.22;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const mid = i * step - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${point(inner, mid - half * 1.35)}L${point(outer, mid - half)}L${point(outer, mid + half)}L${point(inner, mid + half * 1.35)}`;
    d += `A${inner} ${inner} 0 0 1 ${point(inner, mid + step - half * 1.35)}`;
  }
  return `${d}ZM${fmt(12 + hole)} 12A${hole} ${hole} 0 1 0 ${fmt(12 - hole)} 12A${hole} ${hole} 0 1 0 ${fmt(12 + hole)} 12Z`;
}

const COG_PATH = cogPath(8, 11, 8, 3.4);

function nextOf<T>(options: readonly T[], current: T): T {
  const index = options.indexOf(current);
  return options[(index + 1) % options.length] ?? current;
}

export function Sidebar() {
  const { messages } = useI18n();
  const { preferences, update, reopenSetup } = usePreferences();
  const { settings } = messages;
  const effectsOn = preferences.effects === 'on';
  const languageValue = settings.languageNames[preferences.locale];

  return (
    <nav className="sidebar" aria-label={settings.heading}>
      <div className="sidebar__logo" aria-hidden="true">
        ☾
      </div>

      <button
        type="button"
        className="sidebar__button sidebar__button--switch"
        aria-pressed={effectsOn}
        title={settings.cycle(settings.effects, settings.effectStates[preferences.effects])}
        onClick={() => update({ effects: effectsOn ? 'off' : 'on' })}
      >
        <span className="visually-hidden">{settings.effects}</span>
        <span className="sidebar__glyph" aria-hidden="true">
          {settings.effectGlyphs[preferences.effects]}
        </span>
        <span className="sidebar__label" aria-hidden="true">
          FX
        </span>
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

      <button type="button" className="sidebar__settings" aria-label={settings.setup} title={settings.setup} onClick={reopenSetup}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path d={COG_PATH} fill="currentColor" fillRule="evenodd" />
        </svg>
      </button>
    </nav>
  );
}
