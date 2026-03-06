import { supabase } from "./supabase.js";

(async function initAdmin() {
  // 1. Auth check
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }

  const adminId = sessionData.session.user.id;

  // 2. Role check
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .single();

  if (profileError || !profile) {
    alert("Profile not found or access denied");
    console.error(profileError);
    return;
  }

  if (profile.role !== "admin") {
    alert("Access denied: Admins only");
    window.location.href = "index.html";
    return;
  }

  // 3. Elements
  const uploadBtn = document.getElementById("upload-btn");
  const status = document.getElementById("status");

  uploadBtn.addEventListener("click", async () => {
    const email = document.getElementById("client-email").value;
    const eventType = document.getElementById("event-type").value;
    const files = document.getElementById("photos").files;

    if (!email || !files.length) {
      alert("Missing data");
      return;
    }

    // 4. Get client by email
    const { data: client } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!client) {
      alert("Client not found");
      return;
    }

    // 5. Create event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({ user_id: client.id, type: eventType })
      .select()
      .single();

    if (eventError) {
      alert("Failed to create event");
      console.error(eventError);
      return;
    }

    // 6. Upload files
    for (const file of files) {
      const path = `${client.id}/${event.id}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("client-photos")
        .upload(path, file);

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("client-photos")
        .getPublicUrl(path);

      await supabase.from("photos").insert({
        event_id: event.id,
        image_url: urlData.publicUrl,
      });
    }

    status.textContent = "Upload complete!";
  });
})();
