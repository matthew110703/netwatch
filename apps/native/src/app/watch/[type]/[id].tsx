import { WatchScreen } from '@/modules/watch';
import { useLocalSearchParams } from 'expo-router';

export default function WatchRoute() {
  const { type, id, s, e } = useLocalSearchParams<{
    type: string;
    id: string;
    s?: string;
    e?: string;
  }>();
  return (
    <WatchScreen
      typeParam={Array.isArray(type) ? type[0] : type || ''}
      idParam={Array.isArray(id) ? id[0] : id || ''}
      seasonParam={Array.isArray(s) ? s[0] : s}
      episodeParam={Array.isArray(e) ? e[0] : e}
    />
  );
}
