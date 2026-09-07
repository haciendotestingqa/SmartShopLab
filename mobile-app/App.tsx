import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import './global.css';
import {
  addToCart,
  fetchCart,
  fetchProducts,
  sendChatMessage,
  type Cart,
  type Product,
} from './src/api';
import { theme } from './src/theme';

type ViewMode = 'catalog' | 'cart';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const [view, setView] = useState<ViewMode>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente SmartShopLab.' },
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  const cartCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([fetchProducts(), fetchCart()]);
      setProducts(p);
      setCart(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (productId: string) => {
    const updated = await addToCart(productId);
    setCart(updated);
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
      const detail = err instanceof Error ? err.message : 'Error desconocido';
      setChatMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `No pude obtener respuesta del LLM: ${detail}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <StatusBar style="light" />
        {/* Header */}
        <View testID="header" className="bg-primary-dark px-4 py-4 flex-row items-center justify-between">
          <Pressable onPress={() => setView('catalog')} accessibilityRole="button">
            <Text className="text-white text-xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
              SmartShopLab
            </Text>
          </Pressable>
          <Pressable
            testID="cart-button"
            onPress={() => setView('cart')}
            accessibilityRole="button"
            accessibilityLabel="Abrir carrito"
            hitSlop={16}
            className="px-3 py-2"
          >
            <View className="relative" pointerEvents="none">
              <Text className="text-white text-lg">🛒</Text>
              <View
                testID="cart-badge"
                className="absolute -top-1 -right-1 bg-accent rounded-full min-w-[20px] h-5 items-center justify-center px-1"
              >
                <Text className="text-white text-xs font-semibold">{cartCount}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : view === 'catalog' ? (
          <FlatList
            testID="product-grid"
            data={products}
            keyExtractor={(item) => item.id}
            contentContainerClassName="p-4 gap-4"
            numColumns={1}
            ListHeaderComponent={
              <Text className="text-2xl font-bold text-text mb-4" style={{ fontFamily: 'Inter_700Bold' }}>
                Catálogo
              </Text>
            }
            renderItem={({ item }) => (
              <View testID="product-card" className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
                <Image source={{ uri: item.imageUrl }} className="w-full h-44" accessibilityLabel={item.name} />
                <View className="p-4">
                  <Text className="text-lg font-bold text-text" style={{ fontFamily: 'Inter_700Bold' }}>{item.name}</Text>
                  <Text testID="product-price" className="text-primary-main text-xl font-bold mt-2" style={{ fontFamily: 'Inter_700Bold' }}>
                    ${item.price.toFixed(2)}
                  </Text>
                  <Pressable
                    testID="add-to-cart-btn"
                    onPress={() => void handleAdd(item.id)}
                    className="mt-3 bg-accent rounded-lg py-3 items-center"
                    accessibilityRole="button"
                  >
                    <Text className="text-white font-semibold" style={{ fontFamily: 'Inter_600SemiBold' }}>
                      Añadir al Carrito
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        ) : (
          <ScrollView testID="cart-view" className="flex-1 p-4">
            <Text className="text-2xl font-bold text-text mb-4" style={{ fontFamily: 'Inter_700Bold' }}>Tu Carrito</Text>
            {cart?.items.map((item) => (
              <View key={item.productId} testID="cart-item" className="bg-white rounded-xl p-4 mb-3 flex-row gap-3">
                {item.product && (
                  <>
                    <Image source={{ uri: item.product.imageUrl }} className="w-20 h-20 rounded-lg" />
                    <View className="flex-1">
                      <Text className="font-semibold text-text">{item.product.name}</Text>
                      <Text className="text-primary-main font-bold">${item.product.price.toFixed(2)} × {item.quantity}</Text>
                    </View>
                  </>
                )}
              </View>
            ))}
            <Text testID="cart-total" className="text-2xl font-bold text-primary-dark mt-4">
              Total: ${cart?.total.toFixed(2) ?? '0.00'}
            </Text>
            <Pressable onPress={() => setView('catalog')} className="mt-4">
              <Text className="text-primary-main">← Volver al catálogo</Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Chatbot FAB */}
        <Pressable
          testID="chatbot-fab"
          onPress={() => setChatOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-accent rounded-full items-center justify-center shadow-lg"
          accessibilityRole="button"
          accessibilityLabel="Abrir asistente IA"
        >
          <Text className="text-white text-2xl">💬</Text>
        </Pressable>

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
                className="bg-white rounded-t-2xl"
                style={{ maxHeight: '88%', minHeight: 360 }}
                onPress={(e) => e.stopPropagation()}
              >
                <View className="bg-primary-dark px-4 py-4 rounded-t-2xl flex-row justify-between items-center">
                  <View>
                    <Text className="text-white text-lg font-bold">Asistente SmartShopLab</Text>
                    <Text testID="chatbot-status" className="text-green-300 text-sm">● Online</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setChatOpen(false);
                    }}
                    accessibilityLabel="Cerrar chat"
                  >
                    <Text className="text-white text-xl">✕</Text>
                  </Pressable>
                </View>
                <ScrollView
                  testID="chat-messages"
                  className="p-4 bg-background"
                  style={{ maxHeight: 280 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {chatMessages.map((msg, i) => {
                    const isLastAssistant =
                      msg.role === 'assistant' &&
                      i === chatMessages.map((m) => m.role).lastIndexOf('assistant');
                    return (
                      <View key={i} className={`mb-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <View
                          className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-primary-main' : 'bg-white'}`}
                        >
                          <Text
                            testID={
                              msg.role === 'user'
                                ? 'chat-message-user'
                                : isLastAssistant
                                  ? 'chat-message-assistant-latest'
                                  : 'chat-message-assistant'
                            }
                            className={msg.role === 'user' ? 'text-white' : 'text-text'}
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
                  className="flex-row gap-2 p-4 border-t border-gray-200 bg-white"
                >
                  <TextInput
                    testID="chat-input"
                    accessibilityLabel="Escribe tu mensaje"
                    accessible
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Escribe tu mensaje..."
                    placeholderTextColor={theme.colors.textMuted}
                    blurOnSubmit
                    returnKeyType="send"
                    onSubmitEditing={() => void handleSendChat()}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    style={{ color: theme.colors.text, minHeight: 44 }}
                  />
                  <Pressable
                    testID="chat-send"
                    accessibilityLabel="Enviar mensaje"
                    accessibilityRole="button"
                    onPress={() => void handleSendChat()}
                    className="bg-accent rounded-lg px-4 justify-center"
                  >
                    <Text className="text-white font-semibold">Enviar</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
