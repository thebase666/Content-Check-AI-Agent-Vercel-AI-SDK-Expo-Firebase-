import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "http://localhost:3000/api/agent";

export default function AIChatScreen() {
  const [input, setInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as typeof globalThis.fetch,
      api: API_URL,
      body: async () => ({
        // userId: user?.id || "",
      }),
    }),
    onError: (err) => console.error("Chat error:", err),
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 && (
            <Text style={styles.empty}>Chat With TodoList AI Agent👇</Text>
          )}

          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.message,
                m.role === "user" ? styles.user : styles.assistant,
              ]}
            >
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <Text key={i} style={styles.messageText}>
                      {part.text}
                    </Text>
                  );
                }

                if (part.type.startsWith("tool-")) {
                  return (
                    <Text key={i} style={styles.tool}>
                      🔍 AI is calling tool: {part.type}
                    </Text>
                  );
                }

                return null;
              })}
            </View>
          ))}
        </ScrollView>

        {error && <Text style={styles.error}>{error.message}</Text>}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask AI about your todos..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.send} onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
  message: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    maxWidth: "80%",
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: "#e5e7eb",
  },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
  },
  messageText: {
    color: "#000",
  },
  tool: {
    fontSize: 12,
    color: "#555",
    marginTop: 6,
  },
  inputBar: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
  },
  send: {
    marginLeft: 8,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 6,
  },
  sendText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "red",
    textAlign: "center",
  },
});
