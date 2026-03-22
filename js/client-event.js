import { supabase } from "./supabase.js";

(async function loadClientEvent() {
  // 1. Auth check
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    window.location.href = "index.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("eventId");

  if (!eventId) {
    alert("Invalid event");
    return;
  }

  const grid = document.getElementById("photos-grid");
  const noPhotos = document.getElementById("no-photos");
  const title = document.getElementById("event-title");

  // 2. Ensure this event belongs to logged-in user
  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("id, type")
    .eq("id", eventId)
    .eq("user_id", sessionData.session.user.id)
    .maybeSingle();

  if (eventError || !eventRow) {
    noPhotos.style.display = "block";
    noPhotos.textContent = "You do not have access to this event.";
    return;
  }

  if (title) {
    title.textContent = `${eventRow.type.charAt(0).toUpperCase()}${eventRow.type.slice(1)} Event`;
  }

  // 3. Fetch photos
  const { data: photos, error } = await supabase
    .from("photos")
    .select("image_url")
    .eq("event_id", eventId);

  if (error || !photos || photos.length === 0) {
    noPhotos.style.display = "block";
    return;
  }

  // 4. Render photos
  const fragment = document.createDocumentFragment();

  photos.forEach(photo => {
    const img = document.createElement("img");
    img.src = photo.image_url;
    img.alt = "Event photo";
    img.loading = "lazy";
    img.decoding = "async";
    img.classList.add("media-loading");

    img.addEventListener("load", () => {
      img.classList.remove("media-loading");
      img.classList.add("media-ready");
    });

    img.addEventListener("error", () => {
      img.classList.remove("media-loading");
      img.classList.add("media-ready");
    });

    fragment.appendChild(img);
  });

  grid.appendChild(fragment);
})();
