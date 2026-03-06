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

  // 2. Fetch photos
  const { data: photos, error } = await supabase
    .from("photos")
    .select("image_url")
    .eq("event_id", eventId);

  if (error || !photos || photos.length === 0) {
    noPhotos.style.display = "block";
    return;
  }

  // 3. Render photos
  photos.forEach(photo => {
    const img = document.createElement("img");
    img.src = photo.image_url;
    img.alt = "Event photo";
    img.loading = "lazy";
    img.decoding = "async";
    grid.appendChild(img);
  });
})();
