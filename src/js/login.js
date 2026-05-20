// login.js - Login page functionality

// Configuration
const REDIRECT_MAP = {
  admin: "/html/inicio.html",
  manager: "/html/inicio.html",
  worker: "/html/inicio.html"
};

// Check if user is already logged in
function checkExistingSession() {
  const role = sessionStorage.getItem("perfil");
  if (role && REDIRECT_MAP[role]) {
    window.location.href = REDIRECT_MAP[role];
  }
}

// Toggle password visibility with smooth transition
function initPasswordToggle() {
  const toggleBtn = document.getElementById("toggle-password");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const passwordInput = document.getElementById("password");
    const icon = document.querySelector(".eye-icon");
    const isHidden = passwordInput.type === "password";

    // Fade out animation
    icon.style.opacity = "0";

    setTimeout(() => {
      passwordInput.type = isHidden ? "text" : "password";
      icon.src = isHidden
        ? "resources/icons/eye-open.svg"
        : "resources/icons/eye-closed.svg";
      icon.alt = isHidden ? "Ocultar" : "Mostrar";
      icon.style.opacity = "1";
    }, 100);
  });
}

// Handle form submission
function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", handleLoginSubmit);
}

// Process login submission
async function handleLoginSubmit(e) {
  e.preventDefault();

  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-btn");
  const btnText = submitBtn.querySelector("span");
  const spinner = submitBtn.querySelector(".btn-spinner");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  // Reset error state
  errorEl.hidden = true;

  // Validate inputs
  if (!username || !password) {
    showError(errorEl, "Por favor, introduzca su usuario y contraseña");
    return;
  }

  // Show loading state
  setLoadingState(submitBtn, btnText, spinner, true);

  try {
    const data = await login(username, password);
    storeSessionData(data);
    redirectToDashboard(data.user.puesto);
  } catch (err) {
    showError(errorEl, err.message);
    setLoadingState(submitBtn, btnText, spinner, false);
  }
}

// Store session data
function storeSessionData(data) {
  sessionStorage.setItem("token", data.token);
  sessionStorage.setItem("perfil", data.user.puesto);
  sessionStorage.setItem("usuario", JSON.stringify(data.user));
}

// Redirect to appropriate dashboard
function redirectToDashboard(role) {
  window.location.href = REDIRECT_MAP[role];
}

// Display error message
function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

// Toggle loading state
function setLoadingState(btn, text, spinner, isLoading) {
  btn.disabled = isLoading;
  text.hidden = isLoading;
  spinner.hidden = !isLoading;
}

// Initialize login page
function initLoginPage() {
  checkExistingSession();
  initPasswordToggle();
  initLoginForm();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoginPage);
} else {
  initLoginPage();
}
