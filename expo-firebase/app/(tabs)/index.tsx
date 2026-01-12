import { db } from "@/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: any;
  duration: number; // hours
  importance: "low" | "medium" | "high";
}

export default function HomeScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");
  const [duration, setDuration] = useState("1"); // 默认 1 小时
  const [importance, setImportance] = useState<"low" | "medium" | "high">(
    "low"
  );
  const [loading, setLoading] = useState(true);

  const todosCollection = collection(db, "todos");

  useEffect(() => {
    const q = query(todosCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const todosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Todo[];
        setTodos(todosData);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        Alert.alert("Error", "Failed to load todos");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const createTodo = async () => {
    if (!inputText.trim()) {
      Alert.alert("Error", "Please enter a todo");
      return;
    }

    const parsedDuration = Number(duration);

    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      Alert.alert("Error", "Duration must be a positive number");
      return;
    }

    try {
      await addDoc(todosCollection, {
        text: inputText.trim(),
        completed: false,
        createdAt: new Date(),
        duration: parsedDuration,
        importance,
      });

      setInputText("");
      setDuration("");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add todo");
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    await updateDoc(doc(db, "todos", id), {
      completed: !completed,
    });
  };

  const deleteTodo = async (id: string) => {
    Alert.alert("Delete Todo", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "todos", id));
        },
      },
    ]);
  };

  const importanceColor = (level: Todo["importance"]) => {
    if (level === "high") return "#FF3B30";
    if (level === "medium") return "#FF9500";
    return "#34C759";
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TodoList</Text>

      <View style={styles.inputContainer}>
        <Text>Todo Title</Text>

        <TextInput
          style={styles.input}
          placeholder="Todo text"
          value={inputText}
          onChangeText={setInputText}
        />
        <Text>Duration(Hours)</Text>
        <TextInput
          style={styles.input}
          placeholder="Estimate Hours"
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
        />

        <Text>Importance</Text>
        <View style={styles.importanceRow}>
          {(["low", "medium", "high"] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.importanceButton,
                importance === level && {
                  backgroundColor: importanceColor(level),
                },
              ]}
              onPress={() => setImportance(level)}
            >
              <Text style={styles.importanceText}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={createTodo}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <ScrollView>
          {todos.map((todo) => (
            <View key={todo.id} style={styles.todoItem}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => toggleTodo(todo.id, todo.completed)}
              >
                <Text
                  style={[styles.todoText, todo.completed && styles.completed]}
                >
                  {todo.text}
                </Text>

                <Text style={styles.meta}>
                  ⏱ {todo.duration}h ·{" "}
                  <Text
                    style={{
                      color: importanceColor(todo.importance),
                      fontWeight: "600",
                    }}
                  >
                    {todo.importance}
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTodo(todo.id)}
              >
                <Text style={{ color: "#fff" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 16 },

  inputContainer: { gap: 8, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },

  importanceRow: { flexDirection: "row", gap: 8 },
  importanceButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  importanceText: { color: "#000", fontWeight: "600" },

  addButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "600" },

  todoItem: {
    flexDirection: "row",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
  },
  todoText: { fontSize: 16 },
  completed: { textDecorationLine: "line-through", color: "#999" },

  meta: { marginTop: 4, fontSize: 12, color: "#666" },

  deleteButton: {
    backgroundColor: "#FF3B30",
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
});
