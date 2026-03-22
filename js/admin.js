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
    const email = document.getElementById("client-email").value.trim().toLowerCase();
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

    // 5. Reuse existing event for this client + type, else create one
    const { data: existingEvents, error: existingEventError } = await supabase
      .from("events")
      .select("id")
      .eq("user_id", client.id)
      .eq("type", eventType)
      .order("id", { ascending: false })
      .limit(1);

    if (existingEventError) {
      alert("Failed to check existing event");
      console.error(existingEventError);
      return;
    }

    let eventId = existingEvents?.[0]?.id;

    if (!eventId) {
      const { data: createdEvent, error: eventError } = await supabase
        .from("events")
        .insert({ user_id: client.id, type: eventType })
        .select("id")
        .single();

      if (eventError || !createdEvent) {
        alert("Failed to create event");
        console.error(eventError);
        return;
      }

      eventId = createdEvent.id;
    }

    // 6. Upload files
    for (const file of files) {
      const path = `${client.id}/${eventId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("client-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("client-photos")
        .getPublicUrl(path);

      const imageUrl = urlData.publicUrl;
      const { data: existingPhoto } = await supabase
        .from("photos")
        .select("id")
        .eq("event_id", eventId)
        .eq("image_url", imageUrl)
        .limit(1);

      if (!existingPhoto || existingPhoto.length === 0) {
        await supabase.from("photos").insert({
          event_id: eventId,
          image_url: imageUrl,
        });
      }
    }

    status.textContent = "Upload complete!";
  });
})();
