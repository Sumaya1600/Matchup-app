import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, SafeAreaView, Alert,
} from 'react-native';
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { COLORS } from '../../constants';

export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, otherName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const uid = auth.currentUser?.uid;

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: otherName,
      headerStyle:      { backgroundColor: COLORS.darkCard },
      headerTintColor:  COLORS.textLight,
      headerTitleStyle: { fontWeight: '800' },
    });
  }, [otherName]);

  // Listen to messages
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [chatId]);

  // Clear unread count for current user when chat is opened
  useEffect(() => {
    if (!chatId || !uid) return;
    updateDoc(doc(db, 'chats', chatId), {
      [`unread_counts.${uid}`]: 0,
    }).catch(() => {});
  }, [chatId, uid]);

  const send = async () => {
    if (!text.trim() || !chatId) return;
    const msg = text.trim();
    setText('');

    try {
      // Save the message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text:      msg,
        sender_id: uid,
        timestamp: serverTimestamp(),
      });

      // Get chat doc to find the other participant
      const chatRef  = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      const chatData = chatSnap.data() || {};
      const participants = chatData.participants || [];
      const otherUid = participants.find(p => p !== uid);

      // Build update — last message + increment other person's unread count
      const updateData = {
        last_message:      msg,
        last_message_time: serverTimestamp(),
        last_sender_id:    uid,
      };

      if (otherUid) {
        const currentUnread = chatData.unread_counts?.[otherUid] || 0;
        updateData[`unread_counts.${otherUid}`] = currentUnread + 1;
      }

      await updateDoc(chatRef, updateData);

    } catch (e) {
      console.error('Send error:', e.message);
    }
  };

  const confirmDelete = (messageId, senderId) => {
    if (senderId !== uid) {
      Alert.alert('Cannot delete', 'You can only delete your own messages.');
      return;
    }
    Alert.alert(
      'Delete message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'Delete',
          style:   'destructive',
          onPress: () => deleteMessage(messageId),
        },
      ]
    );
  };

  const deleteMessage = async (messageId) => {
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));

      const remaining = messages.filter(m => m.id !== messageId);
      const chatRef   = doc(db, 'chats', chatId);

      if (remaining.length > 0) {
        await updateDoc(chatRef, {
          last_message:      remaining[0].text || '',
          last_message_time: remaining[0].timestamp || serverTimestamp(),
          last_sender_id:    remaining[0].sender_id || uid,
        });
      } else {
        await updateDoc(chatRef, {
          last_message:      '',
          last_message_time: serverTimestamp(),
          last_sender_id:    uid,
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not delete message.');
    }
  };

  const getTimeLabel = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now  = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isMe = item.sender_id === uid;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onLongPress={() => confirmDelete(item.id, item.sender_id)}
              >
                <View style={[
                  styles.bubbleWrapper,
                  isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem,
                ]}>
                  <View style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleThem,
                  ]}>
                    <Text style={[
                      styles.bubbleText,
                      isMe && styles.bubbleTextMe,
                    ]}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={[
                    styles.timeLabel,
                    isMe && styles.timeLabelMe,
                  ]}>
                    {getTimeLabel(item.timestamp)}
                    {isMe && '  hold to delete'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Text style={styles.emptyChatIconText}>💬</Text>
              </View>
              <Text style={styles.emptyChatTitle}>
                Say hello to {otherName}!
              </Text>
              <Text style={styles.emptyChatSub}>
                Start coordinating your match
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
            disabled={!text.trim()}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: COLORS.secondary },
  container: { flex: 1 },

  bubbleWrapper:     { marginBottom: 10 },
  bubbleWrapperMe:   { alignItems: 'flex-end' },
  bubbleWrapperThem: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: '#ecf0f6',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#271b5d',
  },
  bubbleThem: {
    backgroundColor: '#271b5d',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#3d2a7a',
  },
  bubbleText:    { fontSize: 15, color: '#ecf0f6' },
  bubbleTextMe:  { color: COLORS.dark, fontWeight: '600' },

  timeLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
    marginLeft: 4,
  },
  timeLabelMe: {
    marginLeft: 0,
    marginRight: 4,
    textAlign: 'right',
  },

  emptyChat: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  emptyChatIconText: { fontSize: 32 },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  emptyChatSub: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },

  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.darkCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary + '30',
    gap: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textLight,
    backgroundColor: COLORS.secondary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.primary + '40' },
  sendIcon: { color: COLORS.dark, fontSize: 16, fontWeight: '900' },
});