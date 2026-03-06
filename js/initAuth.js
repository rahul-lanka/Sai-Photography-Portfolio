// import { supabase } from "./supabase.js";
// import { login, logout } from "./auth.js";

// const loginBtn = document.getElementById("login-btn");
// const logoutBtn = document.getElementById("logout-btn");

// loginBtn?.addEventListener("click", login);
// logoutBtn?.addEventListener("click", logout);

// // Listen to auth state
// supabase.auth.onAuthStateChange((_event, session) => {
//   if (session) {
//     loginBtn.style.display = "none";
//     logoutBtn.style.display = "inline-block";
//   } else {
//     loginBtn.style.display = "inline-block";
//     logoutBtn.style.display = "none";
//   }
// });
import { supabase } from "./supabase.js";
import { login, logout } from "./auth.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const adminLink = document.getElementById("admin-link");

// Button handlers
loginBtn?.addEventListener("click", login);
logoutBtn?.addEventListener("click", logout);

// Function to update UI based on session
async function updateUI(session) {
  if (session) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";

    // Fetch role
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!error && profile?.role === "admin") {
      if (adminLink) adminLink.style.display = "inline-block";
    } else {
      if (adminLink) adminLink.style.display = "none";
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
  }
}

// 1. Handle already-logged-in user on page load
const {
  data: { session },
} = await supabase.auth.getSession();

await updateUI(session);

// 2. Listen for future auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  updateUI(session);
});
