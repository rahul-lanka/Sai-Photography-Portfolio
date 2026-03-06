// PUBLIC EVENT PAGE (NO AUTH)

// 1. Read event type from URL
const params = new URLSearchParams(window.location.search);
const eventType = params.get("type");

const title = document.getElementById("event-title");
const description = document.getElementById("event-description");
const grid = document.getElementById("photos-grid");
const noPhotos = document.getElementById("no-photos");

if (!eventType) {
  title.textContent = "Event";
  noPhotos.style.display = "block";
  noPhotos.textContent = "Invalid event.";
  throw new Error("No event type provided");
}

// 2. Set title & description
const formatted =
  eventType.charAt(0).toUpperCase() + eventType.slice(1);

title.textContent = `${formatted} Photography`;
description.textContent = `A glimpse of beautiful ${formatted.toLowerCase()} moments captured through our lens.`;

// 3. Public showcase images (temporary)
const publicImages = {
  marriage: [
    "assets/images/slide1.jpg",
    "assets/images/slide2.jpg",
    "assets/images/slide3.jpg",
  ],
  birthday: [
    "assets/images/slide2.jpg",
    "assets/images/slide3.jpg",
  ],
  prewedding: [
    "assets/images/slide3.jpg",
    "assets/images/slide1.jpg",
  ],
  baby: [
    "assets/images/slide2.jpg",
    "assets/images/slide1.jpg",
  ],
  engagement: [
    "assets/images/slide1.jpg",
    "assets/images/slide3.jpg",
  ],
  other: [
    "assets/images/slide2.jpg",
    "assets/images/slide3.jpg",
  ],
};

// 4. Render images
const images = publicImages[eventType];

if (!images || images.length === 0) {
  noPhotos.style.display = "block";
  noPhotos.textContent = "Photos coming soon.";
  return;
}

images.forEach(src => {
  const img = document.createElement("img");
  img.src = src;
  img.alt = `${formatted} photo`;
  img.loading = "lazy";
  img.decoding = "async";
  grid.appendChild(img);
});
