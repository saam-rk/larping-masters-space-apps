/**
 * Start screen: language plus one button per effects mode; pressing either
 * starts the app. The choice is stored in a cookie (see preferences.ts), so
 * the screen only returns when the visitor reopens it from the sidebar.
 */

import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../../i18n/context';
import { LOCALES } from '../../i18n/messages';
import { usePreferences } from '../../preferences/context';
import { EFFECT_MODES } from '../../preferences/preferences';

export function SetupScreen() {
  const { messages, locale, setLocale } = useI18n();
  const { preferences, confirm } = usePreferences();
  const titleId = useId();
  const preferredRef = useRef<HTMLButtonElement>(null);
  const { setup, settings } = messages;

  useEffect(() => {
    preferredRef.current?.focus();
  }, []);

  return (
    <div className="setup" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="setup__window box">
        <div className="box__head">
          <h2 className="box__title" id={titleId}>
            {messages.app.title}
          </h2>
          <span className="box__rule" aria-hidden="true" />
        </div>

        <div className="box__body setup__body">
          <div className="segmented" role="group" aria-label={setup.language}>
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

          <div className="setup__starts" role="group" aria-label={setup.effects}>
            {EFFECT_MODES.map((mode) => {
              const preferred = mode === preferences.effects;
              return (
                <button
                  key={mode}
                  ref={preferred ? preferredRef : undefined}
                  type="button"
                  className={`button button--start${preferred ? ' button--primary' : ''}`}
                  data-mode={mode}
                  onClick={() => confirm({ locale, effects: mode })}
                >
                  <span className="button__name">▶ {setup.start[mode]}</span>
                  <span className="button__detail">{setup.startDetail[mode]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
