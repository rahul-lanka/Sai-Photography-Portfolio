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

function extractStoragePath(imageUrl, bucketName) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch (error) {
    console.error("Failed to parse storage URL", error);
    return null;
  }
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

async function getPrivateEventContext(email, eventType) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: client, error: clientError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (clientError || !client) {
    throw clientError || new Error("Client not found");
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id")
    .eq("user_id", client.id)
    .eq("type", eventType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (eventsError) {
    throw eventsError;
  }

  const eventId = events?.[0]?.id;

  if (!eventId) {
    return { clientId: client.id, eventId: null };
  }

  return { clientId: client.id, eventId };
}

async function loadExistingPublicPhotos(eventType) {
  const { data, error } = await supabase
    .from("public_gallery_photos")
    .select("id, image_url, event_type")
    .eq("event_type", eventType)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(photo => ({
    ...photo,
    bucket: PUBLIC_BUCKET,
    galleryTable: "public_gallery_photos",
  }));
}

async function loadExistingPrivatePhotos(email, eventType) {
  const context = await getPrivateEventContext(email, eventType);

  if (!context.eventId) {
    return [];
  }

  const { data, error } = await supabase
    .from("photos")
    .select("id, image_url, event_id")
    .eq("event_id", context.eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(photo => ({
    ...photo,
    bucket: PRIVATE_BUCKET,
    galleryTable: "photos",
  }));
}

async function deleteFromGalleryRecord(photo) {
  const table = photo.galleryTable;
  const { error } = await supabase.from(table).delete().eq("id", photo.id);
  if (error) throw error;
}

async function deleteFromStorageAndGallery(photo) {
  const storagePath = extractStoragePath(photo.image_url, photo.bucket);

  if (!storagePath) {
    throw new Error("Could not determine storage path for this photo");
  }

  const { error: storageError } = await supabase.storage
    .from(photo.bucket)
    .remove([storagePath]);

  if (storageError) throw storageError;

  await deleteFromGalleryRecord(photo);
}

function createPhotoManagerCard(photo, eventType) {
  const card = document.createElement("article");
  card.className = "admin-photo-card";
  card.dataset.photoId = photo.id;

  const img = document.createElement("img");
  img.src = photo.image_url;
  img.alt = `${eventType} photo`;
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "media-loading";

  img.addEventListener("load", () => {
    img.classList.remove("media-loading");
    img.classList.add("media-ready");
  });

  img.addEventListener("error", () => {
    img.classList.remove("media-loading");
    img.classList.add("media-ready");
  });

  const actions = document.createElement("div");
  actions.className = "admin-photo-actions";

  const removeGalleryBtn = document.createElement("button");
  removeGalleryBtn.type = "button";
  removeGalleryBtn.className = "btn btn-ghost";
  removeGalleryBtn.textContent = "Remove from Gallery";

  const deleteStorageBtn = document.createElement("button");
  deleteStorageBtn.type = "button";
  deleteStorageBtn.className = "btn btn-primary";
  deleteStorageBtn.textContent = "Delete from Storage";

  actions.append(removeGalleryBtn, deleteStorageBtn);
  card.append(img, actions);

  return { card, removeGalleryBtn, deleteStorageBtn };
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
  const loadExistingBtn = document.getElementById("load-existing-btn");
  const managerStatus = document.getElementById("manager-status");
  const existingPhotosGrid = document.getElementById("existing-photos-grid");
  const managerEmpty = document.getElementById("manager-empty");

  let currentManagedPhotos = [];

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

  function resetManagerView() {
    existingPhotosGrid.innerHTML = "";
    managerEmpty.style.display = "none";
    currentManagedPhotos = [];
  }

  function readManagerFilters() {
    return {
      mode: uploadMode.value,
      email: clientEmail.value.trim().toLowerCase(),
      eventType: document.getElementById("event-type").value,
    };
  }

  async function renderManagedPhotos(photos, eventType) {
    resetManagerView();

    if (!photos.length) {
      managerEmpty.style.display = "block";
      setStatus(managerStatus, "No photos found for this selection.");
      return;
    }

    currentManagedPhotos = photos;
    const fragment = document.createDocumentFragment();

    photos.forEach(photo => {
      const { card, removeGalleryBtn, deleteStorageBtn } = createPhotoManagerCard(photo, eventType);

      removeGalleryBtn.addEventListener("click", async () => {
        const confirmed = window.confirm("Remove this photo from the gallery listing only?");
        if (!confirmed) return;

        removeGalleryBtn.disabled = true;
        deleteStorageBtn.disabled = true;
        setStatus(managerStatus, "Removing photo from gallery...");

        try {
          await deleteFromGalleryRecord(photo);
          card.remove();
          currentManagedPhotos = currentManagedPhotos.filter(item => item.id !== photo.id);
          setStatus(managerStatus, "Photo removed from gallery.");
          if (!currentManagedPhotos.length) {
            managerEmpty.style.display = "block";
          }
        } catch (error) {
          console.error(error);
          setStatus(managerStatus, "Failed to remove photo from gallery.", true);
          removeGalleryBtn.disabled = false;
          deleteStorageBtn.disabled = false;
        }
      });

      deleteStorageBtn.addEventListener("click", async () => {
        const confirmed = window.confirm("Delete this photo from storage and remove it from the gallery?");
        if (!confirmed) return;

        removeGalleryBtn.disabled = true;
        deleteStorageBtn.disabled = true;
        setStatus(managerStatus, "Deleting photo from storage...");

        try {
          await deleteFromStorageAndGallery(photo);
          card.remove();
          currentManagedPhotos = currentManagedPhotos.filter(item => item.id !== photo.id);
          setStatus(managerStatus, "Photo deleted from storage and gallery.");
          if (!currentManagedPhotos.length) {
            managerEmpty.style.display = "block";
          }
        } catch (error) {
          console.error(error);
          setStatus(managerStatus, "Failed to delete photo from storage.", true);
          removeGalleryBtn.disabled = false;
          deleteStorageBtn.disabled = false;
        }
      });

      fragment.appendChild(card);
    });

    existingPhotosGrid.appendChild(fragment);
    setStatus(managerStatus, `Loaded ${photos.length} photo${photos.length === 1 ? "" : "s"}.`);
  }

  uploadMode.addEventListener("change", syncUploadModeUI);
  syncUploadModeUI();

  loadExistingBtn.addEventListener("click", async () => {
    const { mode, email, eventType } = readManagerFilters();

    if (mode === "private" && !email) {
      alert("Client email is required to manage private gallery photos");
      return;
    }

    loadExistingBtn.disabled = true;
    resetManagerView();
    setStatus(managerStatus, "Loading existing photos...");

    try {
      const photos =
        mode === "private"
          ? await loadExistingPrivatePhotos(email, eventType)
          : await loadExistingPublicPhotos(eventType);

      await renderManagedPhotos(photos, eventType);
    } catch (error) {
      console.error(error);
      setStatus(managerStatus, "Failed to load existing photos.", true);
      managerEmpty.style.display = "block";
    } finally {
      loadExistingBtn.disabled = false;
    }
  });

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
