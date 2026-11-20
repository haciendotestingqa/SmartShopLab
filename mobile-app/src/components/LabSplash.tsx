import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useThemeMode } from '../ThemeContext';

const logo = require('../../assets/smartshoplab-logo.jpg');

interface LabSplashProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

export default function LabSplash({
  message = 'Waking up the lab…',
  error,
  onRetry,
}: LabSplashProps) {
  const { colors } = useThemeMode();

  return (
    <View
      testID="lab-splash"
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: colors.bg }}
      accessibilityRole="progressbar"
      accessibilityLabel={error ? 'Failed to load' : 'Loading the store'}
    >
      <Image
        source={logo}
        accessibilityLabel="SmartShopLab"
        style={{
          width: 180,
          height: 180,
          borderRadius: 24,
          marginBottom: 28,
          borderWidth: 2,
          borderColor: `${colors.pink}99`,
        }}
        resizeMode="cover"
      />
      <View
        style={{
          width: '100%',
          maxWidth: 360,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: `${colors.pink}40`,
          backgroundColor: colors.surface,
          paddingHorizontal: 20,
          paddingVertical: 18,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: 'Inter_700Bold',
            fontSize: 20,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {error ? 'Could not wake up the lab' : message}
        </Text>
        {!error ? (
          <>
            <Text
              style={{
                color: colors.pink,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 6,
              }}
            >
              Loading the store…
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.textMuted,
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                textAlign: 'center',
                marginBottom: 18,
              }}
            >
              The API may take a few seconds to wake up (cold start).
            </Text>
            <ActivityIndicator size="large" color={colors.pink} />
          </>
        ) : (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {error}
          </Text>
        )}
      </View>
      {error && onRetry ? (
        <Pressable
          testID="splash-retry"
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={{
            marginTop: 16,
            backgroundColor: colors.pink,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
