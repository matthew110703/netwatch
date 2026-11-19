import { NavLinkItem } from './navigation.helper';

export const MOCK_NAV_LINKS: NavLinkItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'movies', label: 'Movies', href: '/#movies' },
  { id: 'tv', label: 'TV Shows', href: '/#tv' },
  { id: 'mylist', label: 'My List', href: '/#mylist' },
];

export const MOCK_USER_PROFILE = {
  name: 'V. Alvarez',
  callsign: 'SPECTRE-7',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
};
