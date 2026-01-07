"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// -------- Supabase Client --------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [session, setSession] = useState(null);
  const [todos, settodos] = useState([]);
  const [todo, settodo] = useState("");
  const [reply, setreply] = useState("");
  const [editingid, seteditingid] = useState(null);
  const [editingvalue, seteditingvalue] = useState("");

  // For email/password login/signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // -------- AUTH: get session on load --------
  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }
    fetchSession();

    const { subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // -------- FETCH TODOS safely --------
  async function Get() {
    if (!session) return;

    try {
      const res = await fetch("https://backend4todo.onrender.com/", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        console.error("Backend error:", await res.text());
        settodos([]);
        return;
      }
      const data = await res.json();
      settodos(data.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      settodos([]);
    }
  }

  useEffect(() => {
    Get();
  }, [session]);

  // -------- TODO HANDLERS --------
  async function Post() {
    if (!todo.trim()) return setreply("Please enter a todo.");
    const res = await fetch("https://backend4todo.onrender.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ todo }),
    });
    const data = await res.json();
    settodos(data.data || []);
    settodo("");
    setreply(data.message || "");
    await Get();
  }

  async function PUT(id) {
    const res = await fetch("https://backend4todo.onrender.com/", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, newTodo: editingvalue }),
    });
    const data = await res.json();
    settodos(data.data || []);
    setreply(data.message || "");
    seteditingid(null);
    seteditingvalue("");
    await Get();
  }

  async function Delete(id) {
    const res = await fetch("https://backend4todo.onrender.com/", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    settodos(data.data || []);
    setreply(data.message || "");
    await Get();
  }

  async function toggleCompleted(id, newValue) {
    try {
      await fetch("https://backend4todo.onrender.com/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, isCompleted: newValue }),
      });
      settodos(todos.map((t) => (t.id === id ? { ...t, isCompleted: newValue } : t)));
    } catch (err) {
      console.error("Toggle error:", err);
    }
  }

  // -------- AUTH ACTIONS --------
  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function loginWithEmail() {
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setAuthError(error.message);
    setSession(data.session);
  }

  async function signupWithEmail() {
    setAuthError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return setAuthError(error.message);
    setSession(data.session);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    settodos([]);
    setEmail("");
    setPassword("");
    setAuthError("");
  }

  // -------- NOT LOGGED IN UI --------
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 rounded border"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-2 rounded border"
          />
          <div className="flex gap-3">
            <button
              onClick={loginWithEmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Login
            </button>
            <button
              onClick={signupWithEmail}
              className="px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              Sign Up
            </button>
          </div>
          {authError && <p className="text-red-500">{authError}</p>}
        </div>

        <hr className="w-1/2 border-gray-400" />

        <button
          onClick={loginWithGoogle}
          className="px-6 py-3 bg-black text-white rounded-lg"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  // -------- MAIN UI --------
  return (
    <div className="min-h-screen dark:bg-gray-900 p-6 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">📝 Todo Dashboard</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Logout
          </button>
        </div>

        {/* Add Todo */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={editingid ? editingvalue : todo}
              onChange={(e) =>
                editingid ? seteditingvalue(e.target.value) : settodo(e.target.value)
              }
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-2 rounded bg-transparent border text-white"
            />
            <button
              onClick={() => (editingid ? PUT(editingid) : todo.trim() && Post())}
              className="px-5 py-2 bg-blue-600 text-white rounded"
            >
              {editingid ? "Update" : "Add"}
            </button>
          </div>
        </div>

        {/* Todos List */}
        {todos?.map((item) => (
          <div key={item.id} className="flex justify-between p-4">
            <div className="flex gap-3">
              <input
                type="checkbox"
                checked={item.isCompleted}
                onChange={() => toggleCompleted(item.id, !item.isCompleted)}
              />
              <span className={`text-black ${item.isCompleted ? "line-through" : ""}`}>
                {item.todo}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  seteditingid(item.id);
                  seteditingvalue(item.todo);
                }}
                className="px-3 py-1 bg-yellow-500 text-white rounded"
              >
                Edit
              </button>
              <button
                onClick={() => Delete(item.id)}
                className="px-3 py-1 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {reply && <div className="text-center mt-4 text-white">{reply}</div>}
      </div>
    </div>
  );
}








