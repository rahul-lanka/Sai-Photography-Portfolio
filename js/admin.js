import { supabase } from "./supabase.js";

const PUBLIC_BUCKET = "public-gallery";
const PRIVATE_BUCKET = "client-photos";

function sanitizeFileName(name) {
  return name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
}

function getSelectedImages(fileList) {
  return Array.from(fileList).filter(file => file.type.startsWith("image/"));
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "";
}

async function createOrLoadPrivateEvent(clientId, eventType) {
  const { data: existingEvents, error: existingEventError } = await supabase
    .from("events")
    .select("id")
    .eq("user_id", clientId)
    .eq("type", eventType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingEventError) {
    throw existingEventError;
  }

  const existingEventId = existingEvents?.[0]?.id;
  if (existingEventId) {
    return existingEventId;
  }

  const { data: createdEvent, error: eventError } = await supabase
    .from("events")
    .insert({ user_id: clientId, type: eventType })
    .select("id")
    .single();

  if (eventError || !createdEvent) {
    throw eventError || new Error("Failed to create private event");
  }

  return createdEvent.id;
}

async function uploadPrivateGallery({ email, eventType, files, status }) {
  const { data: client, error: clientError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (clientError || !client) {
    throw clientError || new Error("Client not found");
  }

  const eventId = await createOrLoadPrivateEvent(client.id, eventType);
  let uploadedCount = 0;

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const path = `${client.id}/${eventId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(PRIVATE_BUCKET)
      .getPublicUrl(path);

    const imageUrl = urlData.publicUrl;
    const { data: existingPhoto, error: existingPhotoError } = await supabase
      .from("photos")
      .select("id")
      .eq("event_id", eventId)
      .eq("image_url", imageUrl)
      .limit(1);

    if (existingPhotoError) {
      console.error(existingPhotoError);
      continue;
    }

    if (!existingPhoto || existingPhoto.length === 0) {
      const { error: insertError } = await supabase.from("photos").insert({
        event_id: eventId,
        image_url: imageUrl,
      });

      if (insertError) {
        console.error(insertError);
        continue;
      }
    }

    uploadedCount += 1;
    setStatus(status, `Uploaded ${uploadedCount} of ${files.length} photos...`);
  }

  return uploadedCount;
}

async function uploadPublicGallery({ eventType, files, status }) {
  let uploadedCount = 0;

  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name;
    const safeRelativePath = relativePath
      .split("/")
      .map(part => sanitizeFileName(part))
      .join("/");
    const path = `${eventType}/${safeRelativePath}`;

    const { error: uploadError } = await supabase.storage
      .from(PUBLIC_BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(PUBLIC_BUCKET)
      .getPublicUrl(path);

    const imageUrl = urlData.publicUrl;
    const { data: existingPhoto, error: existingPhotoError } = await supabase
      .from("public_gallery_photos")
      .select("id")
      .eq("event_type", eventType)
      .eq("image_url", imageUrl)
      .limit(1);

    if (existingPhotoError) {
      console.error(existingPhotoError);
      continue;
    }

    if (!existingPhoto || existingPhoto.length === 0) {
      const { error: insertError } = await supabase
        .from("public_gallery_photos")
        .insert({
          event_type: eventType,
          image_url: imageUrl,
          source: "admin",
          is_published: true,
        });

      if (insertError) {
        console.error(insertError);
        continue;
      }
    }

    uploadedCount += 1;
    setStatus(status, `Uploaded ${uploadedCount} of ${files.length} photos...`);
  }

  return uploadedCount;
}

(async function initAdmin() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }

  const adminId = sessionData.session.user.id;

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

  const uploadBtn = document.getElementById("upload-btn");
  const status = document.getElementById("status");
  const uploadMode = document.getElementById("upload-mode");
  const clientEmail = document.getElementById("client-email");
  const clientEmailHint = document.getElementById("client-email-hint");
  const photosInput = document.getElementById("photos");

  function syncUploadModeUI() {
    const isPrivateMode = uploadMode.value === "private";
    clientEmail.style.display = isPrivateMode ? "block" : "none";
    clientEmailHint.style.display = isPrivateMode ? "block" : "none";
    clientEmail.required = isPrivateMode;
    photosInput.setAttribute("webkitdirectory", "");
    photosInput.setAttribute("multiple", "");

    photosInput.value = "";
    setStatus(
      status,
      isPrivateMode
        ? "Select a client folder or multiple images for a private delivery."
        : "Select a folder or multiple images for the public gallery."
    );
  }

  uploadMode.addEventListener("change", syncUploadModeUI);
  syncUploadModeUI();

  uploadBtn.addEventListener("click", async () => {
    const mode = uploadMode.value;
    const email = clientEmail.value.trim().toLowerCase();
    const eventType = document.getElementById("event-type").value;
    const files = getSelectedImages(document.getElementById("photos").files);

    if (!files.length) {
      alert("Select at least one image");
      return;
    }

    if (mode === "private" && !email) {
      alert("Client email is required for private gallery uploads");
      return;
    }

    uploadBtn.disabled = true;
    setStatus(status, "Uploading photos...");

    try {
      const uploadedCount =
        mode === "private"
          ? await uploadPrivateGallery({ email, eventType, files, status })
          : await uploadPublicGallery({ eventType, files, status });

      setStatus(
        status,
        uploadedCount > 0
          ? `Upload complete. ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} processed.`
          : "No photos were uploaded. Check the console for failed files.",
        uploadedCount === 0
      );
    } catch (error) {
      console.error(error);
      setStatus(status, "Upload failed. Check the console and Supabase policies.", true);
    } finally {
      uploadBtn.disabled = false;
    }
  });
})();
