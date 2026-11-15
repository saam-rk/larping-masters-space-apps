/**
 * Header controls beside the update button: the astronaut mark (left) and the
 * round options button (right) that reopens the landing window with the
 * preferences.
 */

import { useI18n } from '../../i18n/context';
import { usePreferences } from '../../preferences/context';
import { AstronautMark } from './LandingLogo';

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

export function HeaderLogo() {
  return (
    <div className="header-logo" aria-hidden="true">
      <AstronautMark />
    </div>
  );
}

export function OptionsButton() {
  const { messages } = useI18n();
  const { reopenSetup } = usePreferences();
  const { settings } = messages;

  return (
    <button type="button" className="header-options" aria-label={settings.setup} title={settings.setup} onClick={reopenSetup}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path d={COG_PATH} fill="currentColor" fillRule="evenodd" />
      </svg>
    </button>
  );
}
