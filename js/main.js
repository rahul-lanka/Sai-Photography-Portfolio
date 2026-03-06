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
      if (note) note.textContent = "Thanks. Your inquiry has been received.";
      inquiryForm.reset();
    });
  }

  if (!document.querySelector(".floating-cta")) {
    const cta = document.createElement("div");
    cta.className = "floating-cta";
    cta.innerHTML = `
      <a class="cta-whatsapp" href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">WA</a>
      <a class="cta-call" href="tel:+919876543210" aria-label="Call now">Call</a>
    `;
    document.body.appendChild(cta);
  }
});

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
