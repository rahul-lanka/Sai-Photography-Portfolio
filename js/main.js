document.addEventListener("DOMContentLoaded", () => {
  const hero = document.querySelector(".hero");

  const images = [
    "assets/images/slide1.jpg",
    "assets/images/slide2.jpg",
    "assets/images/slide3.jpg",
  ];

  let currentIndex = 0;

  function changeBackgroundImage() {
    if (!hero) return;
    hero.style.backgroundImage = `url(${images[currentIndex]})`;
    currentIndex = (currentIndex + 1) % images.length;
  }

  if (hero) {
    changeBackgroundImage();
    setInterval(changeBackgroundImage, 4000);
  }

  const revealItems = document.querySelectorAll("[data-reveal]");
  if (revealItems.length) {
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    revealItems.forEach(item => revealObserver.observe(item));
  }

  if (hero) {
    window.addEventListener("scroll", () => {
      const y = window.scrollY * 0.2;
      hero.style.backgroundPosition = `center calc(50% + ${y}px)`;
    });
  }

  const inquiryForm = document.querySelector(".inquiry-form");
  if (inquiryForm) {
    inquiryForm.addEventListener("submit", event => {
      event.preventDefault();
      const note = document.querySelector(".mini-note");
      const formData = new FormData(inquiryForm);
      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const eventType = String(formData.get("eventType") || "").trim();
      const eventDate = String(formData.get("eventDate") || "").trim();
      const location = String(formData.get("location") || "").trim();
      const details = String(formData.get("details") || "").trim();

      const lines = [
        "Hello, I want to inquire about photography coverage.",
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Event Type: ${eventType}`,
        `Event Date: ${eventDate || "Not provided"}`,
        `Location: ${location}`,
      ];

      if (details) {
        lines.push(`Details: ${details}`);
      }

      const message = encodeURIComponent(lines.join("\n"));
      const whatsappUrl = `https://wa.me/918096166100?text=${message}`;

      if (note) {
        note.textContent = "Opening WhatsApp with your inquiry message.";
      }

      const popup = window.open(whatsappUrl, "_blank", "noopener");
      if (!popup) {
        window.location.href = whatsappUrl;
      }
    });
  }

  if (!document.querySelector(".floating-cta")) {
    const cta = document.createElement("div");
    cta.className = "floating-cta";
    cta.innerHTML = `
      <a class="cta-instagram" href="https://www.instagram.com/sri_vishwakarma_designing?utm_source=qr&igsh=MXB0aG0wdzN3ZDJvag%3D%3D" target="_blank" rel="noopener noreferrer" aria-label="Open Instagram">
        <img src="assets/icons/instagram.png" alt="" aria-hidden="true">
      </a>
      <a class="cta-facebook" href="https://facebook.com/yourpage" target="_blank" rel="noopener noreferrer" aria-label="Open Facebook">
        <img src="assets/icons/facebook.png" alt="" aria-hidden="true">
      </a>
      <a class="cta-whatsapp" href="https://wa.me/918096166100?text=Hello" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
        <img src="assets/icons/whatsapp.png" alt="" aria-hidden="true">
      </a>
      <a class="cta-call" href="tel:+918096166100" aria-label="Call now">
        <img src="assets/icons/telephone-call.png" alt="" aria-hidden="true">
      </a>
    `;
    document.body.appendChild(cta);
  }

  initSmoothMediaLoading();
  initPhotoLightbox();
  initPointerGlow();
});

registerServiceWorker();

// Active nav highlight
const navLinks = document.querySelectorAll("nav a");
const currentPage = location.pathname.split("/").pop();

navLinks.forEach(link => {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("nav-active");
  }
});

/* ============================= */
/* COUNT UP ANIMATION */
/* ============================= */

const counters = document.querySelectorAll(".stat-number");
let hasAnimated = false;

function animateCounters() {
  if (!counters.length) return;
  counters.forEach(counter => {
    const target = +counter.getAttribute("data-target");
    const speed = 200; // smaller = faster
    const increment = target / speed;

    function updateCount() {
      const current = +counter.innerText;

      if (current < target) {
        counter.innerText = Math.ceil(current + increment);
        setTimeout(updateCount, 10);
      } else {
        counter.innerText = target + "+";
      }
    }

    updateCount();
  });
}

const statsSection = document.querySelector(".stats-section");

if (statsSection) {
  window.addEventListener("scroll", () => {
    const sectionTop = statsSection.offsetTop;
    const sectionHeight = statsSection.offsetHeight;
    const scrollPosition = window.scrollY + window.innerHeight;

    if (!hasAnimated && scrollPosition > sectionTop + sectionHeight / 4) {
      animateCounters();
      hasAnimated = true;
    }
  });
}

function initPhotoLightbox() {
  const grids = document.querySelectorAll(".photos-grid");
  if (!grids.length) return;

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <div class="lightbox-controls">
      <button class="lb-btn" type="button" data-zoom="in" aria-label="Zoom in">+</button>
      <button class="lb-btn" type="button" data-zoom="out" aria-label="Zoom out">-</button>
      <button class="lb-btn" type="button" data-zoom="reset" aria-label="Reset zoom">1:1</button>
      <button class="lb-btn" type="button" data-close="true" aria-label="Close">x</button>
    </div>
    <div class="lightbox-stage">
      <img class="lightbox-img" alt="Preview">
    </div>
  `;
  document.body.appendChild(lightbox);

  const lbImg = lightbox.querySelector(".lightbox-img");
  const lbStage = lightbox.querySelector(".lightbox-stage");
  const zoomInBtn = lightbox.querySelector('[data-zoom="in"]');
  const zoomOutBtn = lightbox.querySelector('[data-zoom="out"]');
  const zoomResetBtn = lightbox.querySelector('[data-zoom="reset"]');
  const closeBtn = lightbox.querySelector("[data-close]");

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;

  function render() {
    lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function clampScale(value) {
    return Math.min(4, Math.max(1, value));
  }

  function resetView() {
    scale = 1;
    tx = 0;
    ty = 0;
    render();
  }

  function openLightbox(src, alt = "Preview") {
    lbImg.src = src;
    lbImg.alt = alt;
    resetView();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    lbImg.src = "";
  }

  grids.forEach(grid => {
    grid.addEventListener("click", e => {
      const target = e.target;
      if (!(target instanceof HTMLImageElement)) return;
      openLightbox(target.src, target.alt || "Photo preview");
    });
  });

  zoomInBtn.addEventListener("click", () => {
    scale = clampScale(scale + 0.2);
    render();
  });

  zoomOutBtn.addEventListener("click", () => {
    scale = clampScale(scale - 0.2);
    if (scale === 1) {
      tx = 0;
      ty = 0;
    }
    render();
  });

  zoomResetBtn.addEventListener("click", resetView);
  closeBtn.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) closeLightbox();
  });

  window.addEventListener("keydown", e => {
    if (e.key === "Escape") closeLightbox();
  });

  lbStage.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      scale = clampScale(scale + delta);
      if (scale === 1) {
        tx = 0;
        ty = 0;
      }
      render();
    },
    { passive: false }
  );

  lbImg.addEventListener("pointerdown", e => {
    if (scale <= 1) return;
    dragging = true;
    startX = e.clientX - tx;
    startY = e.clientY - ty;
    lbImg.setPointerCapture(e.pointerId);
  });

  lbImg.addEventListener("pointermove", e => {
    if (!dragging) return;
    tx = e.clientX - startX;
    ty = e.clientY - startY;
    render();
  });

  lbImg.addEventListener("pointerup", e => {
    dragging = false;
    lbImg.releasePointerCapture(e.pointerId);
  });
}

function initSmoothMediaLoading() {
  const media = document.querySelectorAll(".gallery-card img, .photos-grid img");

  media.forEach(img => {
    if (!(img instanceof HTMLImageElement)) return;

    if (img.complete && img.naturalWidth > 0) {
      img.classList.remove("media-loading");
      img.classList.add("media-ready");
      return;
    }

    img.classList.add("media-loading");

    const markReady = () => {
      img.classList.remove("media-loading");
      img.classList.add("media-ready");
    };

    img.addEventListener("load", markReady, { once: true });
    img.addEventListener("error", markReady, { once: true });
  });
}

function registerServiceWorker() {
  const isLocalhost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const isSecure = location.protocol === "https:" || isLocalhost;

  if (!("serviceWorker" in navigator) || !isSecure) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}

function initPointerGlow() {
  const interactiveCards = document.querySelectorAll(".gallery-card, .contact-item, .inquiry-wrap");
  if (!interactiveCards.length) return;

  interactiveCards.forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      card.style.setProperty("--pointer-x", `${x}px`);
      card.style.setProperty("--pointer-y", `${y}px`);
    });
  });
}
