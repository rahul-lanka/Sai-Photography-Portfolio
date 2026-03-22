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
const myGalleryLink = document.getElementById("my-gallery-link");

// Button handlers
loginBtn?.addEventListener("click", login);
logoutBtn?.addEventListener("click", logout);

async function ensureProfile(session) {
  if (!session?.user) return null;

  const userId = session.user.id;
  const email = (session.user.email || "").trim().toLowerCase();

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to load profile", fetchError);
    return null;
  }

  if (!existingProfile) {
    const { data: createdProfile, error: createError } = await supabase
      .from("profiles")
      .insert({ id: userId, email, role: "client" })
      .select("id, email, role")
      .single();

    if (createError) {
      console.error("Failed to create profile", createError);
      return null;
    }

    return createdProfile;
  }

  if (email && existingProfile.email !== email) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ email })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to sync profile email", updateError);
    } else {
      existingProfile.email = email;
    }
  }

  return existingProfile;
}

// Function to update UI based on session
async function updateUI(session) {
  if (session) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (myGalleryLink) myGalleryLink.style.display = "inline-block";

    const profile = await ensureProfile(session);
    const role = profile?.role || "client";

    if (role === "admin") {
      if (adminLink) adminLink.style.display = "inline-block";
    } else {
      if (adminLink) adminLink.style.display = "none";
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
    if (myGalleryLink) myGalleryLink.style.display = "none";
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
