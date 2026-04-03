import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, SafeAreaView
} from 'react-native';
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { COLORS } from '../../constants';

export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, otherName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    navigation.setOptions({
      title: otherName,
      headerStyle: { backgroundColor: COLORS.darkCard },
      headerTintColor: COLORS.textLight,
      headerTitleStyle: { fontWeight: '800' },
    });

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [chatId]);

  const send = async () => {
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: msg, sender_id: uid, timestamp: serverTimestamp(),
    });
    await updateDoc(doc(db, 'chats', chatId), {
      last_message: msg, last_message_time: serverTimestamp(),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={90}>
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isMe = item.sender_id === uid;
            return (
              <View style={[
                styles.bubbleWrapper,
                isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem
              ]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Say hello to {otherName}! 🎾
              </Text>
            </View>
          }
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.muted}
            onSubmitEditing={send}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim()}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.secondary },
  container: { flex: 1 },
  bubbleWrapper: { marginBottom: 8 },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubbleWrapperThem: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '75%', padding: 12, borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: COLORS.darkCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  bubbleText: { fontSize: 15, color: COLORS.muted },
  bubbleTextMe: { color: COLORS.dark, fontWeight: '600' },
  emptyChat: { alignItems: 'center', marginTop: 40 },
  emptyChatText: { color: COLORS.muted, fontSize: 15 },
  inputRow: {
    flexDirection: 'row', padding: 12,
    backgroundColor: COLORS.darkCard,
    borderTopWidth: 1, borderTopColor: COLORS.primary + '30',
    gap: 10, alignItems: 'flex-end',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: COLORS.primary + '40',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: COLORS.textLight,
    backgroundColor: COLORS.secondary, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 8,
  },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '40' },
  sendIcon: { color: COLORS.dark, fontSize: 16, fontWeight: '900' },
});