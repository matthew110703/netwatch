import { useLocalSearchParams } from 'expo-router';
import { DetailScreen } from '@/modules/detail';

export default function MovieDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetailScreen mediaType="movie" idParam={Array.isArray(id) ? id[0] : id || ''} />;
}
