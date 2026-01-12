import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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

import { db, storage } from "@/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const API_URL = "http://localhost:3000/api/agent2";

/* ----------------------------- types ----------------------------- */

type ReviewResult = {
  allowed: boolean;
  reason: "ok" | "political_content";
};

interface Post {
  id: string;
  text: string;
  imageUrl?: string | null;
  createdAt: Timestamp;
}

/* ----------------------------- component ----------------------------- */

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const postsCollection = collection(db, "posts");

  /* ----------------------------- fetch posts ----------------------------- */

  useEffect(() => {
    const q = query(postsCollection, orderBy("createdAt", "desc"), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];

        setPosts(data);

        if (!initialLoaded) {
          setInitialLoaded(true);
          setLoading(false);
        }
      },
      (error) => {
        console.error(error);
        Alert.alert("Error", "Failed to load posts");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [initialLoaded]);

  /* ----------------------------- helpers ----------------------------- */

  /**
   * 🔍 AI agent review
   */
  const reviewPostContent = async (text: string): Promise<boolean> => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error("Review API failed");
    }

    const data: ReviewResult = await res.json();
    return data.allowed === true;
  };

  /**
   * 🖼️ 上传图片
   */
  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const filename = `posts/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.jpg`;

    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);

    return getDownloadURL(storageRef);
  };

  /* ----------------------------- actions ----------------------------- */

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Media library permission is required."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  /**
   * 🚀 创建 Post（核心逻辑）
   */
  const createPost = async () => {
    if (!inputText.trim() && !selectedImage) {
      Alert.alert("Error", "Please enter text or select an image");
      return;
    }

    setUploading(true);

    try {
      /**
       * ✅ STEP 1：先审查文本
       */
      const allowed = await reviewPostContent(inputText.trim());

      if (!allowed) {
        Alert.alert(
          "Post blocked",
          "This post contains political content and cannot be published."
        );
        return; // ⛔ stop creating
      }

      let imageUrl: string | null = null;

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      await addDoc(postsCollection, {
        text: inputText.trim(),
        imageUrl,
        createdAt: serverTimestamp(),
      });

      setInputText("");
      setSelectedImage(null);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const deletePost = async (id: string) => {
    Alert.alert("Delete post?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "posts", id));
        },
      },
    ]);
  };

  /* ----------------------------- UI ----------------------------- */

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Posts</Text>

      <ScrollView>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="What's on your mind?"
          style={styles.input}
          multiline
        />

        {selectedImage && (
          <ExpoImage source={{ uri: selectedImage }} style={styles.preview} />
        )}

        <View style={styles.row}>
          <TouchableOpacity onPress={pickImage} style={styles.button}>
            <Text>Add Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={createPost}
            disabled={uploading}
            style={[styles.button, uploading && styles.disabled]}
          >
            {uploading ? <ActivityIndicator /> : <Text>Post</Text>}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator />
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.post}>
              {!!post.imageUrl && (
                <ExpoImage
                  source={{ uri: post.imageUrl }}
                  style={styles.postImage}
                />
              )}
              {!!post.text && <Text>{post.text}</Text>}
              <TouchableOpacity onPress={() => deletePost(post.id)}>
                <Text style={{ color: "red" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- styles ----------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  preview: { width: "100%", height: 200, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  button: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  disabled: { opacity: 0.5 },
  post: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  postImage: { width: "100%", height: 200, marginBottom: 8 },
});
