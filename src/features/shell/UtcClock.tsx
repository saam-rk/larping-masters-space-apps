import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/context';

function currentUtc(): string {
  return new Date().toISOString().slice(11, 16);
}

/** Current UTC time (HH:MM), refreshed every few seconds. */
export function UtcClock() {
  const { messages } = useI18n();
  const [time, setTime] = useState(currentUtc);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(currentUtc()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="clock" title={messages.app.clock}>
      <span className="visually-hidden">{messages.app.clock}: </span>
      {time}
      <span className="clock__zone">UTC</span>
    </p>
  );
}
