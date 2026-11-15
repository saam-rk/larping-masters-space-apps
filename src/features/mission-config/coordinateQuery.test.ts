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
    expect(parseCoordinateQuery('NOBILE RIM 2')).toEqual({ kind: 'site', siteId: 'nobile-rim-2' });
    expect(parseCoordinateQuery('hawo')).toEqual({ kind: 'site', siteId: 'haworth' });
    expect(parseCoordinateQuery('kocher')).toEqual({ kind: 'site', siteId: 'de-gerlache-kocher-massif' });
  });

  it('prefers an exact name over longer names that contain it', () => {
    expect(parseCoordinateQuery('Shackleton Rim')).toEqual({ kind: 'site', siteId: 'shackleton-rim' });
    expect(parseCoordinateQuery('shoemaker')).toEqual({ kind: 'site', siteId: 'shoemaker' });
  });

  it('finds a reference site by its Data Book or PGDA code', () => {
    expect(parseCoordinateQuery('DM1')).toEqual({ kind: 'site', siteId: 'amundsen-rim' });
    expect(parseCoordinateQuery('lm1')).toEqual({ kind: 'site', siteId: 'shackleton-rim-b' });
    expect(parseCoordinateQuery('R04')).toEqual({ kind: 'site', siteId: 'shackleton-rim' });
    expect(parseCoordinateQuery('Site20')).toEqual({ kind: 'site', siteId: 'leibnitz-beta-plateau' });
    expect(parseCoordinateQuery('site20v2')).toEqual({ kind: 'site', siteId: 'leibnitz-beta-plateau-extended' });
    expect(parseCoordinateQuery('SL3')).toEqual({ kind: 'site', siteId: 'connecting-ridge-extension' });
  });

  it('ignores apostrophes and keeps the misspelled alias searchable', () => {
    expect(parseCoordinateQuery('idelson')).toEqual({ kind: 'site', siteId: 'idelson-l-crater-1' });
    expect(parseCoordinateQuery("Idel’son L")).toEqual({ kind: 'site', siteId: 'idelson-l-crater-1' });
    expect(parseCoordinateQuery('Connencting Ridge Extension')).toEqual({
      kind: 'site',
      siteId: 'connecting-ridge-extension',
    });
  });

  it('reports partial names shared by several points', () => {
    const result = parseCoordinateQuery('shack');
    expect(result.kind === 'ambiguous' && result.matches.map((site) => site.id)).toEqual([
      'shackleton-rim',
      'shackleton-rim-b',
      'peak-near-shackleton',
    ]);
    const shoemakerRims = parseCoordinateQuery('shoemaker rim');
    expect(shoemakerRims.kind === 'ambiguous' && shoemakerRims.matches).toHaveLength(6);
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
