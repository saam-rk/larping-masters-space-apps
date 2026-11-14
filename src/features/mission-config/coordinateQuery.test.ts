import { describe, expect, it } from 'vitest';
import { formatCoordinateQuery, parseCoordinateQuery } from './coordinateQuery';

describe('parseCoordinateQuery', () => {
  it.each([
    ['-85.4381, 37.36667', -85.4381, 37.36667],
    ['-85.4381,37.36667', -85.4381, 37.36667],
    ['-85,4381; 37,36667', -85.4381, 37.36667],
    ['-85,4381, 37,36667', -85.4381, 37.36667],
    ['-85.4381 37.36667', -85.4381, 37.36667],
    ['-85,37', -85, 37],
    ['85.4381 S, 37.36667 E', -85.4381, 37.36667],
    ['85.4381°S 37.36667°E', -85.4381, 37.36667],
    ['89.7668° S, 171.87° O', -89.7668, -171.87],
    ['89.7668 s 171.87 w', -89.7668, -171.87],
    ['37.36667 E, 85.4381 S', -85.4381, 37.36667],
    ['-80, 200', -80, -160],
    ['  10 , 20  ', 10, 20],
  ])('reads %j as coordinates', (input, latitudeDeg, longitudeEastDeg) => {
    expect(parseCoordinateQuery(input)).toEqual({ kind: 'coordinates', latitudeDeg, longitudeEastDeg });
  });

  it.each([
    ['-85', 'format'],
    ['-85, 37, 12', 'format'],
    ['-85 S, 37', 'format'],
    ['85 N, 37 S', 'format'],
    ['85 E, 37 W', 'format'],
    ['1e2, 3', 'format'],
    ['-95, 37', 'latitude'],
    ['-85, 400', 'longitude'],
    ['xyz', 'format'],
    ['n', 'format'],
  ])('rejects %j (%s)', (input, reason) => {
    expect(parseCoordinateQuery(input)).toEqual({ kind: 'invalid', reason });
  });

  it('finds a reference site by part of its name', () => {
    expect(parseCoordinateQuery('shack')).toEqual({ kind: 'site', siteId: 'shackleton-rim' });
    expect(parseCoordinateQuery('NOBILE RIM 2')).toEqual({ kind: 'site', siteId: 'nobile-rim-2' });
  });

  it('reports several matching names', () => {
    const result = parseCoordinateQuery('nobile');
    expect(result.kind === 'ambiguous' && result.matches.map((site) => site.id)).toEqual(['nobile-rim-1', 'nobile-rim-2']);
  });

  it('treats blank input as empty', () => {
    expect(parseCoordinateQuery('   ')).toEqual({ kind: 'empty' });
  });

  it('formats coordinates so they read back unchanged', () => {
    const text = formatCoordinateQuery(-89.7668, -171.87);
    expect(text).toBe('-89.7668, -171.87');
    expect(parseCoordinateQuery(text)).toEqual({ kind: 'coordinates', latitudeDeg: -89.7668, longitudeEastDeg: -171.87 });
  });
});
