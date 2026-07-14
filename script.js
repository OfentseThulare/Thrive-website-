document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-navigation]");
const revealItems = document.querySelectorAll("[data-reveal]");
const bookingForm = document.querySelector("#booking-form");
const requestDialog = document.querySelector("#request-dialog");
const requestSummary = document.querySelector("[data-request-summary]");
const copyStatus = document.querySelector("[data-copy-status]");
let preparedRequest = "";

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 24);
}

function closeMenu() {
  if (!menuToggle || !navigation) return;

  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  navigation.classList.remove("open");
  document.body.classList.remove("menu-open");
}

function toggleMenu() {
  if (!menuToggle || !navigation) return;

  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  menuToggle.setAttribute("aria-label", open ? "Open navigation menu" : "Close navigation menu");
  navigation.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

menuToggle?.addEventListener("click", toggleMenu);
navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) closeMenu();
});

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
    observer.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("revealed"));
}

document.querySelectorAll("[data-session]").forEach((link) => {
  link.addEventListener("click", () => {
    const sessionSelect = document.querySelector("#session-type");
    if (!sessionSelect) return;
    sessionSelect.value = link.dataset.session || "";
  });
});

const messageField = document.querySelector("#message");
const characterCount = document.querySelector("[data-character-count]");

messageField?.addEventListener("input", () => {
  if (characterCount) characterCount.textContent = String(messageField.value.length);
});

function fieldLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`);
  return label?.textContent?.replace(" *", "") || "This field";
}

function setFieldError(field, message) {
  field.classList.toggle("invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));
  const error = field.closest(".field")?.querySelector(".field-error");
  if (error) error.textContent = message;
}

function validateField(field) {
  const value = field.value.trim();
  let message = "";

  if (field.required && !value) {
    message = `${fieldLabel(field)} is required.`;
  } else if (field.type === "email" && value && !field.validity.valid) {
    message = "Enter a valid email address.";
  }

  setFieldError(field, message);
  return !message;
}

bookingForm?.querySelectorAll("input:not([type='radio']):not([type='checkbox']), select").forEach((field) => {
  field.addEventListener("blur", () => validateField(field));
  field.addEventListener("input", () => {
    if (field.getAttribute("aria-invalid") === "true") validateField(field);
  });
});

function buildRequest(formData) {
  const payment = formData.get("payment") || "To be discussed";
  const note = formData.get("message")?.trim() || "No additional note provided";

  return [
    "THRIVE THROUGH CANCER SESSION REQUEST",
    "",
    `Name: ${formData.get("firstName")} ${formData.get("lastName")}`,
    `Email: ${formData.get("email")}`,
    `Mobile: ${formData.get("phone") || "Not provided"}`,
    `Support area: ${formData.get("supportType")}`,
    `Preferred session: ${formData.get("sessionType")}`,
    `Preferred payment: ${payment}`,
    "",
    "Brief note:",
    note,
  ].join("\n");
}

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const fields = [...bookingForm.querySelectorAll("input:not([type='radio']):not([type='checkbox']), select")];
  const fieldResults = fields.map(validateField);
  const fieldsValid = fieldResults.every(Boolean);
  const consent = bookingForm.querySelector("input[name='consent']");
  const consentError = bookingForm.querySelector(".consent-error");
  const consentValid = Boolean(consent?.checked);

  if (consentError) consentError.textContent = consentValid ? "" : "Please confirm that you understand the purpose of this form.";

  if (!fieldsValid || !consentValid) {
    const firstInvalid = bookingForm.querySelector(".invalid, input[name='consent']:not(:checked)");
    firstInvalid?.focus();
    const status = bookingForm.querySelector(".form-status");
    if (status) status.textContent = "Please review the highlighted fields.";
    return;
  }

  const formData = new FormData(bookingForm);
  preparedRequest = buildRequest(formData);
  if (requestSummary) requestSummary.textContent = preparedRequest;
  if (copyStatus) copyStatus.textContent = "";
  requestDialog?.showModal();
});

document.querySelectorAll("[data-dialog-close]").forEach((button) => {
  button.addEventListener("click", () => requestDialog?.close());
});

requestDialog?.addEventListener("click", (event) => {
  if (event.target === requestDialog) requestDialog.close();
});

document.querySelector("[data-copy-request]")?.addEventListener("click", async () => {
  if (!preparedRequest) return;

  try {
    await navigator.clipboard.writeText(preparedRequest);
    if (copyStatus) copyStatus.textContent = "Request copied to your clipboard.";
  } catch {
    if (copyStatus) copyStatus.textContent = "Select the request text above and copy it manually.";
  }
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
