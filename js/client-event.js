import { supabase } from "./supabase.js";

function createPhotoImage(src) {
  const img = document.createElement("img");
  img.src = src;
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

  return img;
}

function renderPhotosInBatches(grid, photos, batchSize = 12) {
  let visibleCount = 0;
  const loadMoreWrap = document.createElement("div");
  loadMoreWrap.className = "load-more-wrap";

  const loadMoreBtn = document.createElement("button");
  loadMoreBtn.type = "button";
  loadMoreBtn.className = "btn btn-ghost load-more-btn";
  loadMoreWrap.appendChild(loadMoreBtn);

  function renderNextBatch() {
    const nextPhotos = photos.slice(visibleCount, visibleCount + batchSize);
    const fragment = document.createDocumentFragment();

    nextPhotos.forEach(photo => {
      fragment.appendChild(createPhotoImage(photo.image_url));
    });

    grid.appendChild(fragment);
    visibleCount += nextPhotos.length;

    const remaining = photos.length - visibleCount;
    loadMoreBtn.textContent = remaining > 0 ? `Load ${Math.min(batchSize, remaining)} More` : "";
    loadMoreWrap.hidden = remaining <= 0;
  }

  loadMoreBtn.addEventListener("click", renderNextBatch);
  renderNextBatch();

  if (photos.length > batchSize) {
    grid.insertAdjacentElement("afterend", loadMoreWrap);
  }
}

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

  const count = document.createElement("span");
  count.className = "photo-count-pill";
  count.textContent = `${photos.length} photo${photos.length === 1 ? "" : "s"}`;
  title.insertAdjacentElement("afterend", count);

  renderPhotosInBatches(grid, photos);
})();
