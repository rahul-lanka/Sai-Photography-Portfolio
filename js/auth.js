import { supabase } from "./supabase.js";

function getAuthRedirectUrl() {
  const currentUrl = new URL(window.location.href);
  const pathParts = currentUrl.pathname.split("/").filter(Boolean);
  const isGitHubPages = currentUrl.hostname.endsWith("github.io") && pathParts.length > 0;
  const basePath = isGitHubPages ? `/${pathParts[0]}/` : "/";
  return new URL(basePath, currentUrl.origin).toString();
}

// Login with Google
export async function login() {
  const redirectTo = getAuthRedirectUrl();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
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
