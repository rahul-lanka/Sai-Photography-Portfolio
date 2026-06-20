import { supabase } from "./supabase.js";

const HOME_HERO_EVENT_TYPE = "home-hero";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { data, error } = await supabase
      .from("public_gallery_photos")
      .select("image_url")
      .eq("event_type", HOME_HERO_EVENT_TYPE)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load home background images", error);
      return;
    }

    const images = (data || []).map(photo => photo.image_url).filter(Boolean);

    if (images.length && typeof window.setHomeHeroImages === "function") {
      window.setHomeHeroImages(images);
    }
  } catch (error) {
    console.error("Failed to initialize home background images", error);
  }
});
