import { db } from "@/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  console.log("messages", messages);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-2.5-flash"),
    stopWhen: stepCountIs(10),
    // Once the step count reaches 10, the agent automatically stops
    // ➡️ Prevents the agent from running in an infinite loop
    // ➡️ Limits token usage and overall cost
    // ➡️ Keeps the workflow controllable

    system: `
  You are an intelligent productivity assistant with access to the user's Todo database.

  Your role is NOT just to list todos, but to:
  - Analyze workload
  - Identify priorities
  - Estimate time usage
  - Help users decide WHAT to do next

  IMPORTANT:
  - Proactively use tools when analysis would help
  - Use structured data (importance, duration, completion state)
  - Give actionable, decision-oriented responses

  Todo fields:
  - text
  - completed
  - duration (hours)
  - importance (low | medium | high)
  - createdAt

  Examples:
  User: "What should I do today?"
  → Fetch incomplete todos
  → Prioritize high importance + short duration

  User: "Do I have too much work?"
  → Fetch incomplete todos
  → Sum duration
  → Reflect workload back to user
  `,
    messages: modelMessages,
    tools: {
      getAllTodos: tool({
        description:
          "Fetch ALL todos for the user. Use this for general analysis, workload overview, or when no filter is specified.",
        inputSchema: z.object({}),
        execute: async () => {
          console.log("getAllTodos");
          const todosRef = collection(db, "todos");
          const q = query(todosRef, orderBy("createdAt", "desc"));
          const snap = await getDocs(q);

          const todos = snap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              text: data.text,
              completed: data.completed,
              duration: data.duration,
              importance: data.importance,
              createdAt: data.createdAt?.toDate?.() ?? null,
            };
          });

          return {
            count: todos.length,
            todos,
          };
        },
      }),

      getTodosByFilter: tool({
        description:
          "Fetch todos by filter such as completion state, importance level, or created time range.",
        inputSchema: z.object({
          completed: z.boolean().optional(),
          importance: z.enum(["low", "medium", "high"]).optional(),
          createdAfter: z.string().optional(), // ISO date
        }),

        execute: async ({ completed, importance, createdAfter }) => {
          console.log("getTodosByFilter");

          let q = query(collection(db, "todos"));
          //   Although q looks like it’s being reassigned, Firestore queries are immutable.
          //   Each query() call returns a new query that adds constraints on top of the previous one, rather than replacing it.
          if (completed !== undefined) {
            q = query(q, where("completed", "==", completed));
          }

          if (importance) {
            q = query(q, where("importance", "==", importance));
          }

          if (createdAfter) {
            q = query(
              q,
              where(
                "createdAt",
                ">=",
                Timestamp.fromDate(new Date(createdAfter))
              )
            );
          }

          const snap = await getDocs(q);

          const todos = snap.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              text: data.text,
              completed: data.completed,
              duration: data.duration,
              importance: data.importance,
              createdAt: data.createdAt?.toDate?.() ?? null,
            };
          });

          return {
            count: todos.length,
            todos,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
