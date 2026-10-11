import type { Team } from './catalog';

export const BANNERS = {
  'roman-aquila': { name: 'Aquila · eagle standard', team: 0, style: 'eagle', cloth: '#9a302d' },
  'roman-vexillum': {
    name: 'Vexillum · crimson banner',
    team: 0,
    style: 'wreath',
    cloth: '#8d2525',
  },
  'gaul-boar': { name: 'Boar standard · green banner', team: 1, style: 'boar', cloth: '#285743' },
  'gaul-horse': {
    name: 'Horse standard · blue-green banner',
    team: 1,
    style: 'horse',
    cloth: '#24626a',
  },
} as const;
export type BannerId = keyof typeof BANNERS;
export type BannerSlot = BannerId | 'none';
export function isBannerSlot(value: unknown): value is BannerSlot {
  return value === 'none' || (typeof value === 'string' && Object.hasOwn(BANNERS, value));
}
export function bannerAllowed(item: BannerSlot, team: Team): boolean {
  return item === 'none' || BANNERS[item].team === team;
}
