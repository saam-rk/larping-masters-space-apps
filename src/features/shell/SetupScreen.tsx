/**
 * First-visit "BIOS" screen: pick language and effects level before any heavy
 * effect starts. The choice is stored in a cookie (see preferences.ts), so the
 * screen only returns when the visitor reopens it from the sidebar.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../../i18n/context';
import { LOCALES } from '../../i18n/messages';
import { usePreferences } from '../../preferences/context';
import { EFFECT_LEVELS, readDeviceHints, recommendPreferences, type EffectLevel } from '../../preferences/preferences';

export function SetupScreen() {
  const { messages, locale, setLocale } = useI18n();
  const { preferences, confirm } = usePreferences();
  const [effects, setEffects] = useState<EffectLevel>(preferences.effects);
  const [recommended] = useState(() => recommendPreferences(readDeviceHints()).effects);
  const [cores] = useState(() => navigator.hardwareConcurrency || null);
  const titleId = useId();
  const startRef = useRef<HTMLButtonElement>(null);
  const { setup, settings } = messages;

  useEffect(() => {
    startRef.current?.focus();
  }, []);

  return (
    <div className="setup" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <form
        className="setup__window box"
        onSubmit={(event) => {
          event.preventDefault();
          confirm({ ...preferences, locale, effects });
        }}
      >
        <div className="box__head">
          <h2 className="box__title" id={titleId}>
            {setup.title}
          </h2>
          <span className="box__rule" aria-hidden="true" />
          <span className="box__tag box__tag--accent">[F1]</span>
        </div>

        <div className="box__body setup__body">
          <pre className="setup__boot" aria-hidden="true">
            {[...setup.boot, cores ? setup.cores(cores) : setup.coresUnknown].join('\n')}
          </pre>
          <p className="setup__ready">
            <span className="blink" aria-hidden="true">
              ▌
            </span>{' '}
            {setup.ready}
          </p>

          <fieldset className="choice">
            <legend className="choice__legend">{setup.language}</legend>
            <div className="choice__options">
              {LOCALES.map((option) => (
                <label key={option} className="choice__option">
                  <input
                    type="radio"
                    name="setup-language"
                    value={option}
                    checked={locale === option}
                    onChange={() => setLocale(option)}
                  />
                  <span className="choice__marker" aria-hidden="true" />
                  <span>{settings.languageNames[option]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice">
            <legend className="choice__legend">{setup.effects}</legend>
            <div className="choice__options choice__options--stacked">
              {EFFECT_LEVELS.map((level) => (
                <label key={level} className="choice__option">
                  <input
                    type="radio"
                    name="setup-effects"
                    value={level}
                    checked={effects === level}
                    onChange={() => setEffects(level)}
                  />
                  <span className="choice__marker" aria-hidden="true" />
                  <span className="choice__text">
                    <span className="choice__name">
                      {settings.effectLevels[level]}
                      {level === recommended && <span className="choice__badge"> ({setup.recommended})</span>}
                    </span>
                    <span className="choice__detail">{setup.effectDetail[level]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button ref={startRef} type="submit" className="button button--primary">
            [ {setup.start} ]
          </button>
          <p className="setup__note">{setup.cookieNote}</p>
        </div>
      </form>
    </div>
  );
}
