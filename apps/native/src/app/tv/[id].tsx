import { useLocalSearchParams } from 'expo-router';
import { DetailScreen } from '@/modules/detail';

export default function TvDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetailScreen mediaType="tv" idParam={Array.isArray(id) ? id[0] : id || ''} />;
}
