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

  // 3. Render event cards
  events.forEach(event => {
    const card = document.createElement("a");
    card.href = `client-event.html?eventId=${event.id}`;
    card.className = "gallery-card reveal-in";

    card.innerHTML = `
      <img src="assets/images/slide1.jpg" alt="${event.type}" loading="lazy" decoding="async">
      <span>${event.type.toUpperCase()}</span>
    `;

    container.appendChild(card);
  });
})();
