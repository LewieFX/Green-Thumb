import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text className="text-2xl">{emoji}</Text>
      <Text
        className={`text-xs mt-0.5 ${focused ? 'text-green-600 font-semibold' : 'text-gray-400'}`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="designer"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌿" label="Plants" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ href: null }}
      />
    </Tabs>
  );
}
