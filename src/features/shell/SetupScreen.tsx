/**
 * Landing window: shown on the first visit and when reopened from the
 * header options button. The intro and logo sit on the left (stacked above the options when
 * the window is narrow); the options choose the language and the effects mode,
 * and "Save preferences" stores them in a cookie (see preferences.ts) and
 * closes the window.
 *
 * The language applies immediately so the window can be read in it; the
 * effects mode only takes effect on saving (the logo previews it).
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../../i18n/context';
import { LOCALES } from '../../i18n/messages';
import { usePreferences } from '../../preferences/context';
import { EFFECT_MODES, prefersReducedMotion, type EffectMode } from '../../preferences/preferences';
import { LandingLogo } from './LandingLogo';

export function SetupScreen() {
  const { messages, locale, setLocale } = useI18n();
  const { preferences, confirm } = usePreferences();
  const [effects, setEffects] = useState<EffectMode>(preferences.effects);
  const [reducedMotion] = useState(prefersReducedMotion);
  const titleId = useId();
  const introId = useId();
  const languageId = useId();
  const effectsId = useId();
  const saveRef = useRef<HTMLButtonElement>(null);
  const { setup, settings } = messages;

  useEffect(() => {
    saveRef.current?.focus();
  }, []);

  return (
    <div className="setup" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={introId}>
      <div className="setup__window box">
        <div className="box__head">
          <h2 className="box__title" id={titleId}>
            {messages.app.title}
          </h2>
          <span className="box__rule" aria-hidden="true" />
        </div>

        <div className="box__body setup__body">
          <section className="setup__intro">
            <LandingLogo animated={effects === 'on' && !reducedMotion} />
            <div className="setup__copy">
              <p className="setup__tagline">{setup.tagline}</p>
              <div id={introId}>
                {setup.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="setup__options" aria-label={setup.options}>
            <div className="setup__field">
              <span className="setup__label" id={languageId}>
                {setup.language}
              </span>
              <div className="segmented" role="group" aria-labelledby={languageId}>
                {LOCALES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    lang={option}
                    className="segmented__option"
                    aria-pressed={locale === option}
                    onClick={() => setLocale(option)}
                  >
                    {settings.languageNames[option]}
                  </button>
                ))}
              </div>
            </div>

            <div className="setup__field">
              <span className="setup__label" id={effectsId}>
                {setup.effects}
              </span>
              <div className="setup__modes" role="group" aria-labelledby={effectsId}>
                {EFFECT_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className="setup__mode"
                    data-mode={mode}
                    aria-pressed={effects === mode}
                    onClick={() => setEffects(mode)}
                  >
                    <span className="setup__mode-name">{setup.effectNames[mode]}</span>
                    <span className="setup__mode-detail">{setup.effectDetails[mode]}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              ref={saveRef}
              type="button"
              className="button button--primary setup__save"
              onClick={() => confirm({ locale, effects, advanced: preferences.advanced })}
            >
              <span aria-hidden="true">▶ </span>
              {setup.save}
            </button>
            <p className="setup__storage">{setup.storage}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
