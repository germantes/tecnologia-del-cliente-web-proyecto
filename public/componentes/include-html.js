class IncludeHTML extends HTMLElement {
    async connectedCallback() {
        const src = this.getAttribute("src");

        if (!src) {
            console.error("Falta el atributo src en <include-html>.");
            return;
        }

        try {
            const response = await fetch(src);

            if (!response.ok) {
                throw new Error(`No se pudo cargar el componente: ${src}`);
            }

            this.innerHTML = await response.text();
            this.marcarElementoActivo();
            this.rellenarAnioActual();
            this.prepararCerrarSesion();
        } catch (error) {
            console.error(error);
            this.innerHTML = "<p>Error al cargar el componente.</p>";
        }
    }

    marcarElementoActivo() {
        const enlaces = this.querySelectorAll("[data-nav]");

        enlaces.forEach((enlace) => {
            enlace.classList.toggle(
                "bancosol-header__nav-item--active",
                enlace.dataset.nav === "inicio"
            );
        });
    }

    rellenarAnioActual() {
        const elementosAnio = this.querySelectorAll("[data-current-year]");
        const anioActual = new Date().getFullYear();

        elementosAnio.forEach((elemento) => {
            elemento.textContent = anioActual;
        });
    }

    prepararCerrarSesion() {
        const botonCerrarSesion = this.querySelector("[data-logout]");

        if (!botonCerrarSesion) {
            return;
        }

        botonCerrarSesion.addEventListener("click", () => {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("perfil");
            sessionStorage.removeItem("usuario");
            window.location.href = "/";
        });
    }
}

customElements.define("include-html", IncludeHTML);
