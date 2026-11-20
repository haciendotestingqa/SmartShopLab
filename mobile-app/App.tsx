import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import './global.css';
import {
  addToCart,
  fetchCart,
  fetchProducts,
  pingHealth,
  removeFromCart,
  sendChatMessage,
  setCartItemQuantity,
  type Cart,
  type Product,
  type RetryProgress,
} from './src/api';
import LabSplash from './src/components/LabSplash';
import { ThemeProvider, useThemeMode } from './src/ThemeContext';

const logo = require('./assets/smartshoplab-logo.jpg');
const TIKTOK_URL = 'https://www.tiktok.com/@haciendotestingqa';
const YOUTUBE_URL = 'https://www.youtube.com/@haciendotestingqa';
/** Reserve space for FAB + hint so the footer stays visible */
const FAB_SAFE_BOTTOM = 168;
const SCROLL_BOTTOM_THRESHOLD = 80;

/** Same Heroicons paths as web Header theme toggle */
function SunIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" opacity={opacity} accessibilityElementsHidden>
      <Path
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoonIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" opacity={opacity} accessibilityElementsHidden>
      <Path
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SiteFooter({
  colors,
}: {
  colors: { text: string; pink: string; orange: string; surface: string; bg: string };
}) {
  return (
    <View
      testID="site-footer"
      style={{
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: `${colors.pink}33`,
        backgroundColor: colors.surface,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 13, marginBottom: 8 }}>
        by <Text style={{ color: colors.pink, fontFamily: 'Inter_600SemiBold' }}>@haciendotestingqa</Text>
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open TikTok"
          onPress={() => void Linking.openURL(TIKTOK_URL)}
          style={{
            backgroundColor: colors.pink,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>TikTok</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open YouTube"
          onPress={() => void Linking.openURL(YOUTUBE_URL)}
          style={{
            borderWidth: 1,
            borderColor: `${colors.orange}99`,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: colors.bg,
          }}
        >
          <Text style={{ color: colors.orange, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
            YouTube
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type ViewMode = 'catalog' | 'cart';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function AppShell() {
  const { colors, isDark, toggleMode } = useThemeMode();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const [view, setView] = useState<ViewMode>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [booting, setBooting] = useState(true);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [, setRetryProgress] = useState<RetryProgress>({
    attempt: 1,
    maxAttempts: 6,
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I am the SmartShopLab assistant (Lumina).' },
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [cartBusyId, setCartBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nearBottom, setNearBottom] = useState(false);
  const fabHintAnim = useRef(new Animated.Value(0)).current;
  const scrollMetrics = useRef({ contentH: 0, layoutH: 0, offsetY: 0 });

  const recomputeNearBottom = useCallback(() => {
    const { contentH, layoutH, offsetY } = scrollMetrics.current;
    if (layoutH <= 0 || contentH <= 0) return;
    const fitsWithoutScroll = contentH <= layoutH + 1;
    const distanceFromEnd = contentH - layoutH - offsetY;
    setNearBottom(fitsWithoutScroll || distanceFromEnd <= SCROLL_BOTTOM_THRESHOLD);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      scrollMetrics.current = {
        contentH: contentSize.height,
        layoutH: layoutMeasurement.height,
        offsetY: contentOffset.y,
      };
      recomputeNearBottom();
    },
    [recomputeNearBottom]
  );

  const handleContentSizeChange = useCallback(
    (_w: number, h: number) => {
      scrollMetrics.current.contentH = h;
      recomputeNearBottom();
    },
    [recomputeNearBottom]
  );

  const handleListLayout = useCallback(
    (height: number) => {
      scrollMetrics.current.layoutH = height;
      recomputeNearBottom();
    },
    [recomputeNearBottom]
  );

  useEffect(() => {
    Animated.spring(fabHintAnim, {
      toValue: nearBottom ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [nearBottom, fabHintAnim]);

  useEffect(() => {
    scrollMetrics.current.offsetY = 0;
    setNearBottom(false);
  }, [view]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const cartCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const bootLoad = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    void pingHealth();
    try {
      const [p, c] = await Promise.all([
        fetchProducts(undefined, setRetryProgress),
        fetchCart(setRetryProgress),
      ]);
      setProducts(p);
      setCart(c);
      setReady(true);
    } catch {
      setBootError(
        'The API did not respond in time (possible Render cold start). Tap Retry to try again.'
      );
      setReady(false);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void bootLoad();
  }, [bootLoad]);

  const handleAdd = async (productId: string) => {
    const updated = await addToCart(productId);
    setCart(updated);
    const name = products.find((p) => p.id === productId)?.name;
    setToast(name ? `${name} was added to the cart` : 'Product added to the cart');
  };

  const handleSetQuantity = async (
    productId: string,
    nextQuantity: number,
    currentQuantity: number
  ) => {
    if (cartBusyId) return;
    setCartBusyId(productId);
    try {
      const updated = await setCartItemQuantity(productId, nextQuantity, currentQuantity);
      setCart(updated);
    } finally {
      setCartBusyId(null);
    }
  };

  const handleRemove = async (productId: string, currentQuantity: number) => {
    if (cartBusyId) return;
    setCartBusyId(productId);
    try {
      const updated = await removeFromCart(productId, currentQuantity);
      setCart(updated);
    } finally {
      setCartBusyId(null);
    }
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || sending) return;
    Keyboard.dismiss();
    setChatInput('');
    setChatMessages((m) => [...m, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await sendChatMessage(text, sessionId);
      setSessionId(res.sessionId);
      setChatMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Could not get a reply from the LLM: ${detail}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.pink} />
      </View>
    );
  }

  const showSplash = booting || Boolean(bootError) || !ready;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        testID="header"
        className="px-3 py-3 flex-row items-center"
        style={{
          backgroundColor: colors.header,
          borderBottomColor: `${colors.pink}33`,
          borderBottomWidth: 1,
          gap: 8,
        }}
      >
        <Pressable
          onPress={() => setView('catalog')}
          accessibilityRole="button"
          className="flex-row items-center gap-2"
          style={{ flex: 1, minWidth: 0 }}
        >
          <Image
            source={logo}
            accessibilityLabel="SmartShopLab"
            style={{ width: 64, height: 64, borderRadius: 14 }}
            resizeMode="cover"
          />
          <Text
            numberOfLines={1}
            style={{
              color: '#fff',
              fontFamily: 'Inter_700Bold',
              fontSize: 18,
              flexShrink: 1,
            }}
          >
            SmartShopLab
          </Text>
        </Pressable>

        <View className="flex-row items-center" style={{ flexShrink: 0, gap: 10 }}>
          <Pressable
            testID="theme-toggle"
            onPress={toggleMode}
            accessibilityRole="switch"
            accessibilityState={{ checked: isDark }}
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex-row items-center"
            style={{
              borderWidth: 1,
              borderColor: `${colors.pink}55`,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.08)',
              paddingHorizontal: 8,
              paddingVertical: 6,
              gap: 6,
            }}
          >
            <SunIcon color={!isDark ? colors.orange : '#D1D5DB'} />
            <View
              style={{
                width: 36,
                height: 20,
                borderRadius: 999,
                backgroundColor: isDark ? colors.pink : 'rgba(255,255,255,0.25)',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  backgroundColor: '#fff',
                  alignSelf: isDark ? 'flex-end' : 'flex-start',
                }}
              />
            </View>
            <MoonIcon color={isDark ? colors.pink : '#D1D5DB'} />
          </Pressable>
          <Pressable
            testID="cart-button"
            onPress={() => setView('cart')}
            accessibilityRole="button"
            accessibilityLabel="Open cart"
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <View className="relative" pointerEvents="none">
              <Text className="text-white text-lg">🛒</Text>
              <View
                testID="cart-badge"
                className="absolute -top-1 -right-1 rounded-full min-w-[20px] h-5 items-center justify-center px-1"
                style={{ backgroundColor: colors.pink }}
              >
                <Text className="text-white text-xs font-semibold">{cartCount}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {showSplash ? (
        <LabSplash error={bootError} onRetry={() => void bootLoad()} />
      ) : view === 'catalog' ? (
        <FlatList
          testID="product-grid"
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-4"
          contentContainerStyle={{ paddingBottom: FAB_SAFE_BOTTOM }}
          numColumns={1}
          style={{ backgroundColor: colors.bg }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handleContentSizeChange}
          onLayout={(e) => handleListLayout(e.nativeEvent.layout.height)}
          ListHeaderComponent={
            <Text
              className="text-2xl font-bold mb-4"
              style={{ fontFamily: 'Inter_700Bold', color: colors.text }}
            >
              Catalog
            </Text>
          }
          ListFooterComponent={<SiteFooter colors={colors} />}
          renderItem={({ item }) => (
            <View
              testID="product-card"
              className="rounded-xl overflow-hidden mb-4"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: `${colors.pink}33`,
              }}
            >
              <Image
                source={{ uri: item.imageUrl }}
                className="w-full h-44"
                accessibilityLabel={item.name}
              />
              <View className="p-4">
                <Text
                  className="text-xs font-semibold uppercase mb-1"
                  style={{ color: colors.textMuted, letterSpacing: 0.6 }}
                >
                  {item.category}
                </Text>
                <Text
                  className="text-lg font-bold"
                  style={{ fontFamily: 'Inter_700Bold', color: colors.text }}
                >
                  {item.name}
                </Text>
                <Text
                  testID="product-description"
                  numberOfLines={2}
                  style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 }}
                >
                  {item.description}
                </Text>
                <Text
                  testID="product-price"
                  className="text-xl font-bold mt-2"
                  style={{ fontFamily: 'Inter_700Bold', color: colors.pink }}
                >
                  ${item.price.toFixed(2)}
                </Text>
                <Pressable
                  testID="add-to-cart-btn"
                  onPress={() => void handleAdd(item.id)}
                  className="mt-3 rounded-lg py-3 items-center"
                  style={{ backgroundColor: colors.orange }}
                  accessibilityRole="button"
                >
                  <Text
                    className="text-white font-semibold"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                  >
                    Add to Cart
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      ) : (
        <ScrollView
          testID="cart-view"
          className="flex-1 p-4"
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={{ paddingBottom: FAB_SAFE_BOTTOM }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handleContentSizeChange}
          onLayout={(e) => handleListLayout(e.nativeEvent.layout.height)}
        >
          <Text
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: 'Inter_700Bold', color: colors.text }}
          >
            Your Cart
          </Text>
          {cart?.items.map((item) => (
            <View
              key={item.productId}
              testID="cart-item"
              className="rounded-xl p-4 mb-3"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: `${colors.pink}22` }}
            >
              {item.product && (
                <>
                  <View className="flex-row gap-3 mb-3">
                    <Image source={{ uri: item.product.imageUrl }} className="w-20 h-20 rounded-lg" />
                    <View className="flex-1">
                      <Text className="font-semibold" style={{ color: colors.text }}>
                        {item.product.name}
                      </Text>
                      <Text className="font-bold" style={{ color: colors.pink }}>
                        ${item.product.price.toFixed(2)} × {item.quantity}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      testID="cart-qty-decrease"
                      accessibilityLabel={`Decrease quantity of ${item.product.name}`}
                      disabled={cartBusyId === item.productId}
                      onPress={() =>
                        void handleSetQuantity(item.productId, item.quantity - 1, item.quantity)
                      }
                      className="h-9 w-9 items-center justify-center rounded-lg"
                      style={{
                        borderWidth: 1,
                        borderColor: `${colors.pink}55`,
                        opacity: cartBusyId === item.productId ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>−</Text>
                    </Pressable>
                    <Text testID="cart-qty" style={{ color: colors.text, minWidth: 24, textAlign: 'center' }}>
                      {item.quantity}
                    </Text>
                    <Pressable
                      testID="cart-qty-increase"
                      accessibilityLabel={`Increase quantity of ${item.product.name}`}
                      disabled={cartBusyId === item.productId}
                      onPress={() =>
                        void handleSetQuantity(item.productId, item.quantity + 1, item.quantity)
                      }
                      className="h-9 w-9 items-center justify-center rounded-lg"
                      style={{
                        borderWidth: 1,
                        borderColor: `${colors.pink}55`,
                        opacity: cartBusyId === item.productId ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>+</Text>
                    </Pressable>
                    <Pressable
                      testID="cart-item-remove"
                      accessibilityLabel={`Remove ${item.product.name} from cart`}
                      disabled={cartBusyId === item.productId}
                      onPress={() => void handleRemove(item.productId, item.quantity)}
                      className="ml-2 rounded-lg px-3 py-2"
                      style={{
                        borderWidth: 1,
                        borderColor: `${colors.orange}88`,
                        opacity: cartBusyId === item.productId ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: colors.orange, fontFamily: 'Inter_600SemiBold' }}>Remove</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ))}
          <Text
            testID="cart-total"
            className="text-2xl font-bold mt-4"
            style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}
          >
            Total: ${cart?.total.toFixed(2) ?? '0.00'}
          </Text>
          <Pressable onPress={() => setView('catalog')} className="mt-4">
            <Text style={{ color: colors.pink }}>← Back to catalog</Text>
          </Pressable>
          <SiteFooter colors={colors} />
        </ScrollView>
      )}

      {!showSplash && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            zIndex: 40,
            width: 56,
            height: 56,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 64,
              width: 176,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: `${colors.pink}66`,
              backgroundColor: colors.surface,
              paddingHorizontal: 12,
              paddingVertical: 8,
              opacity: fabHintAnim,
              transform: [
                {
                  translateY: fabHintAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
                {
                  scale: fabHintAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 12,
                textAlign: 'right',
              }}
            >
              Catalog questions?
            </Text>
            <Text
              style={{
                color: colors.pink,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 12,
                textAlign: 'right',
                marginTop: 2,
              }}
            >
              Chat with the assistant (Lumina)
            </Text>
          </Animated.View>
          <Pressable
            testID="chatbot-fab"
            onPress={() => setChatOpen(true)}
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.pink }}
            accessibilityRole="button"
            accessibilityLabel="Open AI assistant (Lumina). Catalog questions? Chat with the assistant."
          >
            <Text className="text-white text-2xl">💬</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <Pressable
            accessible={false}
            className="flex-1 bg-black/40 justify-end"
            onPress={() => {
              Keyboard.dismiss();
              setChatOpen(false);
            }}
          >
            <Pressable
              accessible={false}
              testID="chatbot-modal"
              className="rounded-t-2xl"
              style={{ maxHeight: '88%', minHeight: 360, backgroundColor: colors.surface }}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                className="px-4 py-4 rounded-t-2xl flex-row justify-between items-center"
                style={{ backgroundColor: colors.header }}
              >
                <View>
                  <Text className="text-white text-lg font-bold">Assistant (Lumina)</Text>
                  <Text className="text-white/80 text-xs">SmartShopLab</Text>
                  <Text testID="chatbot-status" className="text-green-300 text-sm">
                    ● Online
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setChatOpen(false);
                  }}
                  accessibilityLabel="Close chat"
                >
                  <Text className="text-white text-xl">✕</Text>
                </Pressable>
              </View>
              <ScrollView
                testID="chat-messages"
                className="p-4"
                style={{ maxHeight: 280, backgroundColor: colors.bg }}
                keyboardShouldPersistTaps="handled"
              >
                {chatMessages.map((msg, i) => {
                  const isLastAssistant =
                    msg.role === 'assistant' &&
                    i === chatMessages.map((m) => m.role).lastIndexOf('assistant');
                  return (
                    <View
                      key={i}
                      className={`mb-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <View
                        className="max-w-[85%] rounded-2xl px-4 py-2"
                        style={{
                          backgroundColor:
                            msg.role === 'user' ? colors.pink : colors.surface,
                        }}
                      >
                        <Text
                          testID={
                            msg.role === 'user'
                              ? 'chat-message-user'
                              : isLastAssistant
                                ? 'chat-message-assistant-latest'
                                : 'chat-message-assistant'
                          }
                          style={{ color: msg.role === 'user' ? '#fff' : colors.text }}
                        >
                          {msg.content}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View
                testID="chat-composer"
                collapsable={false}
                className="flex-row gap-2 p-4 border-t"
                style={{
                  backgroundColor: colors.surface,
                  borderTopColor: `${colors.pink}22`,
                }}
              >
                <TextInput
                  testID="chat-input"
                  accessibilityLabel="Type your message"
                  accessible
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type your message..."
                  placeholderTextColor={colors.textMuted}
                  blurOnSubmit
                  returnKeyType="send"
                  onSubmitEditing={() => void handleSendChat()}
                  className="flex-1 rounded-lg px-3 py-2 border"
                  style={{
                    color: colors.text,
                    minHeight: 44,
                    borderColor: `${colors.pink}44`,
                    backgroundColor: colors.bg,
                  }}
                />
                <Pressable
                  testID="chat-send"
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                  onPress={() => void handleSendChat()}
                  className="rounded-lg px-4 justify-center"
                  style={{ backgroundColor: colors.orange }}
                >
                  <Text className="text-white font-semibold">Send</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {toast ? (
        <View
          testID="cart-toast"
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 88,
            zIndex: 50,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${colors.pink}55`,
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 12,
            shadowColor: colors.pink,
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontFamily: 'Inter_600SemiBold',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {toast}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
