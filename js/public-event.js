import { supabase } from "./supabase.js";

function buildUniqueImages(localImages, remoteImages) {
  return [...new Set([...(localImages || []), ...(remoteImages || [])])];
}

// PUBLIC EVENT PAGE (NO AUTH)
(async function loadPublicEvent() {
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
    return;
  }

  const eventCatalog = {
    marriage: {
      title: "Marriage Photography",
      description: "A glimpse of beautiful marriage moments captured through our lens.",
      images: [
        "assets/images/slide1.jpg",
        "assets/images/slide2.jpg",
        "assets/images/slide3.jpg",
      ],
    },
    birthday: {
      title: "Birthday Photography",
      description: "A glimpse of joyful birthday moments captured through our lens.",
      images: [
        "assets/Birthday/NNY_0001-Edit.jpg",
      ],
    },
    prewedding: {
      title: "Pre Wedding Photography",
      description: "A glimpse of cinematic pre wedding moments captured through our lens.",
      images: [
        "assets/images/slide3.jpg",
        "assets/images/slide1.jpg",
      ],
    },
    halfsarie: {
      title: "Half Saree Photography",
      description: "A glimpse of graceful half saree portraits captured through our lens.",
      images: [
        "assets/HalfSarie/NNY_0001-Edit.jpg",
        "assets/HalfSarie/NNY_0010.jpg",
        "assets/HalfSarie/NNY_0019.jpg",
        "assets/HalfSarie/NNY_0023-Edit.jpg",
        "assets/HalfSarie/NNY_0028.jpg",
        "assets/HalfSarie/NNY_0040.jpg",
        "assets/HalfSarie/NNY_0064.jpg",
      ],
    },
    maternity: {
      title: "Maternity Photography",
      description: "A glimpse of warm maternity portraits captured through our lens.",
      images: [
        "assets/Maternity-Shoot/DSC00516.jpg",
        "assets/Maternity-Shoot/DSC00517.jpg",
        "assets/Maternity-Shoot/DSC00522.jpg",
        "assets/Maternity-Shoot/DSC00525.jpg",
        "assets/Maternity-Shoot/DSC00526.jpg",
        "assets/Maternity-Shoot/DSC00529.jpg",
        "assets/Maternity-Shoot/DSC00532.jpg",
        "assets/Maternity-Shoot/DSC00534.jpg",
        "assets/Maternity-Shoot/DSC00539.jpg",
        "assets/Maternity-Shoot/DSC00547.jpg",
      ],
    },
    baby: {
      title: "Baby Event Photography",
      description: "A glimpse of warm baby event moments captured through our lens.",
      images: [
        "assets/images/slide2.jpg",
        "assets/images/slide1.jpg",
      ],
    },
    engagement: {
      title: "Engagement Photography",
      description: "A glimpse of elegant engagement moments captured through our lens.",
      images: [
        "assets/Engagement/DSC05435-2.jpg",
        "assets/Engagement/DSC05441-2.jpg",
        "assets/Engagement/DSC05442-2.jpg",
        "assets/Engagement/DSC05455-2.jpg",
      ],
    },
    other: {
      title: "Other Event Photography",
      description: "A glimpse of custom event moments captured through our lens.",
      images: [],
    },
  };

  const eventMeta = eventCatalog[eventType];
  const formatted = eventMeta?.title?.replace(" Photography", "") || eventType;

  title.textContent = eventMeta?.title || `${formatted} Photography`;
  description.textContent =
    eventMeta?.description ||
    `A glimpse of beautiful ${formatted.toLowerCase()} moments captured through our lens.`;

  let localImages = eventMeta?.images || [];

  if (eventType === "other") {
    try {
      const response = await fetch("assets/Others/manifest.json", { cache: "no-store" });
      if (response.ok) {
        const manifest = await response.json();
        if (Array.isArray(manifest?.images)) {
          localImages = manifest.images.map(file => `assets/Others/${file}`);
        }
      }
    } catch (error) {
      console.error("Failed to load Others manifest:", error);
    }
  }

  let remoteImages = [];

  try {
    const { data: remotePhotos, error } = await supabase
      .from("public_gallery_photos")
      .select("image_url")
      .eq("event_type", eventType)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load public gallery photos:", error);
    } else {
      remoteImages = (remotePhotos || []).map(photo => photo.image_url);
    }
  } catch (error) {
    console.error("Failed to fetch public gallery photos:", error);
  }

  const images = buildUniqueImages(localImages, remoteImages);

  if (!images.length) {
    noPhotos.style.display = "block";
    noPhotos.textContent = "Photos coming soon.";
    return;
  }

  const fragment = document.createDocumentFragment();

  images.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${formatted} photo`;
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
