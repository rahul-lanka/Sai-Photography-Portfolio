import { supabase } from "./supabase.js";

(async function loadClientGallery() {
  // 1. Auth check
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    alert("Please login to view your gallery");
    window.location.href = "index.html";
    return;
  }

  const userId = sessionData.session.user.id;

  const container = document.getElementById("client-events");
  const noEvents = document.getElementById("no-events");

  // 2. Fetch client events
  const { data: events, error } = await supabase
    .from("events")
    .select("id, type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !events || events.length === 0) {
    noEvents.style.display = "block";
    return;
  }

  const eventIds = events.map(event => event.id);
  const { data: eventPhotos, error: photosError } = await supabase
    .from("photos")
    .select("event_id, image_url")
    .in("event_id", eventIds);

  if (photosError) {
    console.error("Failed to load gallery photo counts", photosError);
  }

  const photoMetaByEvent = new Map();
  (eventPhotos || []).forEach(photo => {
    const current = photoMetaByEvent.get(photo.event_id) || {
      count: 0,
      cover: photo.image_url,
    };

    current.count += 1;
    current.cover ||= photo.image_url;
    photoMetaByEvent.set(photo.event_id, current);
  });

  // 3. Render event cards
  events.forEach(event => {
    const photoMeta = photoMetaByEvent.get(event.id) || { count: 0, cover: "assets/images/slide1.jpg" };
    const label = event.type.replace(/-/g, " ");
    const card = document.createElement("a");
    card.href = `client-event.html?eventId=${event.id}`;
    card.className = "gallery-card reveal-in";

    card.innerHTML = `
      <img src="${photoMeta.cover}" alt="${label}" loading="lazy" decoding="async">
      <div class="gallery-card-copy">
        <h4>${label.toUpperCase()}</h4>
        <small>${photoMeta.count} photo${photoMeta.count === 1 ? "" : "s"}</small>
      </div>
    `;

    container.appendChild(card);
  });
})();
