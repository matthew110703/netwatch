import type { MediaCardModel } from '@netwatch/core';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { MediaRail } from '@/components/media-rail';
import { ScreenState } from '@/components/screen-state';
import { useNetwatchTheme } from '@/theme/ThemeContext';

type CatalogListProps = {
  title: string;
  load: () => Promise<MediaCardModel[]>;
};

export function CatalogList({ title, load }: CatalogListProps) {
  const { colors } = useNetwatchTheme();
  const [items, setItems] = useState<MediaCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void run();
  }, [run]);

  if (loading) return <ScreenState mode="loading" />;
  if (error) return <ScreenState mode="error" message={error} />;
  if (items.length === 0) return <ScreenState mode="empty" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: 16 }}>
      <ScrollView>
        <MediaRail title={title} items={items} />
      </ScrollView>
    </View>
  );
}