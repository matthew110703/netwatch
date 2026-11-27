import { Tabs } from 'expo-router';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { useWatchlist } from '@/context/WatchlistContext';
import { useNetwatchTheme } from '@/theme/ThemeContext';

function TabIcon({
  activeName,
  inactiveName,
  focused,
  color,
}: {
  activeName: AppIconName;
  inactiveName: AppIconName;
  focused: boolean;
  color: string;
}) {
  return (
    <AppIcon
      name={focused ? activeName : inactiveName}
      size={21}
      color={color}
    />
  );
}

export default function TabLayout() {
  const { colors } = useNetwatchTheme();
  const { count } = useWatchlist();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceLowest,
          borderTopColor: `${colors.outlineVariant}55`,
          height: 62,
          paddingBottom: 7,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="home"
              inactiveName="home-outline"
              focused={focused}
              color={typeof color === 'string' ? color : colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Movies',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="film"
              inactiveName="film-outline"
              focused={focused}
              color={typeof color === 'string' ? color : colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tv"
        options={{
          title: 'TV',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="tv"
              inactiveName="tv-outline"
              focused={focused}
              color={typeof color === 'string' ? color : colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'My List',
          tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.onPrimary,
            fontSize: 10,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="bookmark"
              inactiveName="bookmark-outline"
              focused={focused}
              color={typeof color === 'string' ? color : colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              activeName="search"
              inactiveName="search-outline"
              focused={focused}
              color={typeof color === 'string' ? color : colors.onSurfaceVariant}
            />
          ),
        }}
      />
    </Tabs>
  );
}
