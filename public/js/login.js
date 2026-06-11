// login.js - Login page functionality

// Check if user is already logged in
function checkExistingSession() {
  // Si ya hay token en sesión, vamos directos al inicio sin comprobar roles
  if (sessionStorage.getItem("token")) {
    window.location.href = "/homepage";
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

  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  // Reset error state
  errorEl.hidden = true;

  // Validate inputs
  if (!email || !password) {
    showError(errorEl, "Por favor, introduzca su usuario y contraseña");
    return;
  }

  // Show loading state
  setLoadingState(submitBtn, btnText, spinner, true);

  try {
    const data = await login(email, password);

    storeSessionData(data);
    redirectToDashboard(data.user.puesto);
  } catch (err) {
    showError(errorEl, err.message);
    setLoadingState(submitBtn, btnText, spinner, false);
  }
}

// Store session data
function storeSessionData(data) {
  // REQUISITO: Limpieza en el login.
  // Ahora solo guardamos el token JWT de forma segura.
  // Eliminamos el guardado de "perfil" ya que lo leeremos desde el token.
  sessionStorage.setItem("token", data.token);
  sessionStorage.setItem("usuario", JSON.stringify(data.user));
}

// Redirect to appropriate dashboard
function redirectToDashboard(role) {
  window.location.href = "/homepage";
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