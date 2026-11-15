/**
 * Compact table over the third-person visual scale: azimuth and elevation of
 * the Sun and the Earth in their guide colors, the Earth − Sun difference of
 * each and their angular separation (see `angles.ts`). Same true values as
 * the 3D labels, readable even when the labels overlap, and the vertical
 * exaggeration of the drawing when there is one.
 */

import { formatAngle } from '../../format';
import { useI18n } from '../../i18n/context';
import { angularSeparationDeg, azimuthDifferenceDeg, elevationExaggeration, normalizeAzimuth } from './angles';
import type { SceneBody } from './bodies';
import { BODY_COLOR } from './bodyColors';

export function AngleLegend({ bodies }: { bodies: readonly SceneBody[] }) {
  const { messages, locale } = useI18n();
  const { legend } = messages.scene.guides;
  const sun = bodies.find((body) => body.body === 'sun');
  const earth = bodies.find((body) => body.body === 'earth');
  if (bodies.length === 0) return null;
  const exaggeration = elevationExaggeration(bodies.map((body) => body.elevationDeg));
  return (
    <table className="angle-legend">
      <caption className="visually-hidden">{legend.caption}</caption>
      <thead>
        <tr>
          <td />
          <th scope="col">{legend.azimuth}</th>
          <th scope="col">{legend.elevation}</th>
        </tr>
      </thead>
      <tbody>
        {bodies.map((body) => (
          <tr key={body.body} style={{ color: BODY_COLOR[body.body] }}>
            <th scope="row">{messages.bodies[body.body]}</th>
            <td>{formatAngle(normalizeAzimuth(body.azimuthDeg), locale)}</td>
            <td>{formatAngle(body.elevationDeg, locale)}</td>
          </tr>
        ))}
        {sun && earth && (
          <>
            <tr className="angle-legend__difference">
              <th scope="row" title={legend.differenceTitle}>
                {legend.difference}
              </th>
              <td>{formatAngle(azimuthDifferenceDeg(sun.azimuthDeg, earth.azimuthDeg), locale, true)}</td>
              <td>{formatAngle(earth.elevationDeg - sun.elevationDeg, locale, true)}</td>
            </tr>
            <tr className="angle-legend__difference">
              <th scope="row">{legend.separation}</th>
              <td colSpan={2}>{formatAngle(angularSeparationDeg(sun, earth), locale)}</td>
            </tr>
          </>
        )}
      </tbody>
      {exaggeration > 1 && (
        <tfoot>
          <tr>
            <td colSpan={3}>{legend.exaggeration(String(exaggeration))}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
