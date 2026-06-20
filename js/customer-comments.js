import { supabase } from "./supabase.js";

const COMMENTS_TABLE = "customer_comments";

function escapeText(value) {
  const span = document.createElement("span");
  span.textContent = value || "";
  return span.innerHTML;
}

function renderStars(rating) {
  const count = Math.max(1, Math.min(5, Number(rating) || 5));
  return "★".repeat(count);
}

function createCommentCard(comment, index) {
  const card = document.createElement("blockquote");
  card.className = "testimonial-card customer-comment-card reveal-in";
  card.style.setProperty("--comment-delay", `${Math.min(index * 70, 420)}ms`);
  card.innerHTML = `
    <div class="comment-stars" aria-label="${comment.rating || 5} star rating">${renderStars(comment.rating)}</div>
    <p>"${escapeText(comment.comment)}"</p>
    <cite>${escapeText(comment.name)}${comment.event_type ? `, ${escapeText(comment.event_type)}` : ""}</cite>
  `;
  return card;
}

async function loadApprovedComments() {
  const grid = document.getElementById("customer-comments-grid");
  if (!grid) return;

  try {
    const { data, error } = await supabase
      .from(COMMENTS_TABLE)
      .select("name, event_type, comment, rating")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(9);

    if (error) {
      console.error("Failed to load customer comments", error);
      return;
    }

    if (!data?.length) return;

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();
    data.forEach((comment, index) => {
      fragment.appendChild(createCommentCard(comment, index));
    });
    grid.appendChild(fragment);
  } catch (error) {
    console.error("Failed to initialize customer comments", error);
  }
}

function initCommentForm() {
  const form = document.getElementById("customer-comment-form");
  const status = document.getElementById("customer-comment-status");
  if (!form || !status) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const eventType = String(formData.get("event_type") || "").trim();
    const comment = String(formData.get("comment") || "").trim();
    const rating = Number(formData.get("rating") || 5);

    if (!name || !comment) {
      status.textContent = "Please add your name and comment.";
      status.style.color = "#b42318";
      return;
    }

    status.textContent = "Submitting your comment...";
    status.style.color = "";

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const { error } = await supabase.from(COMMENTS_TABLE).insert({
        name,
        event_type: eventType || null,
        comment,
        rating,
        is_approved: false,
      });

      if (error) throw error;

      form.reset();
      status.textContent = "Thank you. Your comment is waiting for review.";
    } catch (error) {
      console.error("Failed to submit customer comment", error);
      status.textContent = "Could not submit right now. Please try again later.";
      status.style.color = "#b42318";
    } finally {
      submitButton.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadApprovedComments();
  initCommentForm();
});
