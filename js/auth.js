import { supabase } from "./supabase.js";

// Login with Google
export async function login() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
  });
}

// Logout
export async function logout() {
  await supabase.auth.signOut();
}

// Get current user
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
