// import { supabase } from "./supabase.js";

// const { data } = await supabase.auth.getSession();

// if (!data.session) {
//   window.location.href = "index.html";
// }

// // Read event type from URL
// const params = new URLSearchParams(window.location.search);
// const eventType = params.get("type");

// const title = document.getElementById("event-title");
// const description = document.getElementById("event-description");

// if (eventType) {
//   const formatted = eventType.charAt(0).toUpperCase() + eventType.slice(1);

//   title.textContent = `${formatted} Photography`;
//   description.textContent = `A collection of beautiful ${formatted.toLowerCase()} moments captured through my lens.`;
// }


import { supabase } from "./supabase.js";

// 1. Ensure user is logged in
const { data: sessionData } = await supabase.auth.getSession();

// if (!sessionData.session) {
//   window.location.href = "index.html";
// }

const userId = sessionData.session.user.id;

// 2. Read event type from URL
const params = new URLSearchParams(window.location.search);
const eventType = params.get("type");

const title = document.getElementById("event-title");
const grid = document.getElementById("photos-grid");
const noPhotos = document.getElementById("no-photos");

if (!eventType) {
  title.textContent = "Event";
  noPhotos.style.display = "block";
  noPhotos.textContent = "Invalid event.";
  throw new Error("No event type provided");
}

// Capitalize title
title.textContent =
  eventType.charAt(0).toUpperCase() + eventType.slice(1) + " Photography";

// 3. Fetch event for this user + type
const { data: events, error: eventError } = await supabase
  .from("events")
  .select("id")
  .eq("user_id", userId)
  .eq("type", eventType)
  .limit(1);

if (eventError || !events || events.length === 0) {
  noPhotos.style.display = "block";
  noPhotos.textContent = "No event found.";
  throw new Error("Event not found");
}

const eventId = events[0].id;

// 4. Fetch photos for this event
const { data: photos, error: photosError } = await supabase
  .from("photos")
  .select("image_url")
  .eq("event_id", eventId);

if (photosError || !photos || photos.length === 0) {
  noPhotos.style.display = "block";
  noPhotos.textContent = "No photos uploaded yet.";
  throw new Error("No photos");
}

// 5. Render photos
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
