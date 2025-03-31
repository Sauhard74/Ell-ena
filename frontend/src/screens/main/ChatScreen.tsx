import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../styles/theme';
import { nlpAPI } from '../../services/api';
import { CHAT_HISTORY_KEY } from '../../constants/storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { isDark } = useTheme();
  const currentTheme = getTheme(isDark);
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    loadChatHistory();
    
    // If no messages, show welcome message
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: "Hi there! I'm Ell-ena, your AI Product Manager assistant. How can I help you today?",
          sender: 'ai',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, []);
  
  const loadChatHistory = async () => {
    try {
      const storedMessages = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (error) {
      console.error('Error loading chat history', error);
    }
  };
  
  const saveChatHistory = async (updatedMessages: Message[]) => {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Error saving chat history', error);
    }
  };
  
  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    
    // Save to local storage
    saveChatHistory(updatedMessages);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Set loading state for AI response
    setIsLoading(true);
    
    try {
      // Call API to get AI response
      const response = await nlpAPI.processMessage({
        message: userMessage.text,
        context: messages.slice(-5).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))
      });
      
      if (response.data && response.data.response) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: response.data.response,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        
        const newMessages = [...updatedMessages, aiMessage];
        setMessages(newMessages);
        
        // Save to local storage
        saveChatHistory(newMessages);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error getting AI response', error);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I'm sorry, I couldn't process your request. Please try again.",
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      const newMessages = [...updatedMessages, errorMessage];
      setMessages(newMessages);
      
      // Save to local storage
      saveChatHistory(newMessages);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all messages?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const welcomeMessage: Message = {
              id: Date.now().toString(),
              text: "Hi there! I'm Ell-ena, your AI Product Manager assistant. How can I help you today?",
              sender: 'ai',
              timestamp: new Date().toISOString()
            };
            
            setMessages([welcomeMessage]);
            await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
            await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([welcomeMessage]));
          }
        }
      ]
    );
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser 
            ? [styles.userMessageBubble, { backgroundColor: currentTheme.colors.primary }] 
            : [styles.aiMessageBubble, { backgroundColor: isDark ? currentTheme.colors.card : '#f0f0f0' }]
        ]}>
          <Text style={[
            styles.messageText,
            isUser 
              ? styles.userMessageText 
              : [styles.aiMessageText, { color: currentTheme.colors.text }]
          ]}>
            {item.text}
          </Text>
        </View>
        <Text style={[styles.messageTime, { color: currentTheme.colors.textLight }]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: currentTheme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>Chat with Ell-ena</Text>
        <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={22} color={currentTheme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.messagesContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}
        showsVerticalScrollIndicator={false}
      />
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={currentTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>Ell-ena is thinking...</Text>
        </View>
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ marginBottom: insets.bottom > 0 ? 0 : 4 }}
      >
        <View style={[styles.inputContainer, { 
          backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa',
          borderTopColor: currentTheme.colors.border
        }]}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: isDark ? '#38383a' : '#ffffff',
              color: currentTheme.colors.text,
              borderColor: currentTheme.colors.border
            }]}
            placeholder="Type a message..."
            placeholderTextColor={currentTheme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleSend}
            disabled={inputText.trim().length === 0}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 8,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userMessageBubble: {
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  }
});

export default ChatScreen; 