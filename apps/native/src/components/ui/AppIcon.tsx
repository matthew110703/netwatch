import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type AppIconName =
  | 'home'
  | 'home-outline'
  | 'film'
  | 'film-outline'
  | 'tv'
  | 'tv-outline'
  | 'bookmark'
  | 'bookmark-outline'
  | 'search'
  | 'search-outline'
  | 'play'
  | 'pause'
  | 'plus'
  | 'check'
  | 'info'
  | 'close'
  | 'back'
  | 'forward'
  | 'sun'
  | 'moon'
  | 'star'
  | 'share'
  | 'trash'
  | 'server'
  | 'rewind-10'
  | 'forward-10'
  | 'sparkles';

const ICON_MAP: Record<AppIconName, IoniconName> = {
  home: 'home',
  'home-outline': 'home-outline',
  film: 'film',
  'film-outline': 'film-outline',
  tv: 'tv',
  'tv-outline': 'tv-outline',
  bookmark: 'bookmark',
  'bookmark-outline': 'bookmark-outline',
  search: 'search',
  'search-outline': 'search-outline',
  play: 'play',
  pause: 'pause',
  plus: 'add',
  check: 'checkmark',
  info: 'information-circle-outline',
  close: 'close',
  back: 'arrow-back',
  forward: 'arrow-forward',
  sun: 'sunny',
  moon: 'moon',
  star: 'star',
  share: 'share-social-outline',
  trash: 'trash-outline',
  server: 'server-outline',
  'rewind-10': 'play-back',
  'forward-10': 'play-forward',
  sparkles: 'sparkles',
};

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function AppIcon({
  name,
  size = 18,
  color = '#ffffff',
  style,
}: AppIconProps) {
  return (
    <Ionicons
      name={ICON_MAP[name]}
      size={size}
      color={color}
      style={style}
    />
  );
}
