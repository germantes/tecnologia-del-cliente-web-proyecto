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

            // Insertar el HTML del componente
            const htmlText = await response.text();
            this.innerHTML = htmlText;

            // Ejecutar los scripts que vienen en el HTML incluido (todas las páginas utilizan <script> en header.html).
            // IMPORTANTE: cuando se inserta HTML con innerHTML, los <script src="..."> no se ejecutan automáticamente.
            // Aquí los detectamos y los cargamos/ejecutamos en el orden en que aparecen.
            await this._executeIncludedScripts();

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

    // Ejecuta scripts incluidos en el HTML inyectado. Carga externals secuencialmente y ejecuta inlines.
    async _executeIncludedScripts() {
        const scripts = Array.from(this.querySelectorAll('script'));
        for (const s of scripts) {
            try {
                if (s.src) {
                    // Cargar script externo creando un elemento <script> en el head.
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        // Mantener el mismo tipo/nomodificaciones si existe
                        if (s.type) script.type = s.type;
                        script.src = s.src;
                        script.async = false; // mantener orden
                        script.onload = () => resolve();
                        script.onerror = () => {
                            console.error('No se pudo cargar el script incluido:', s.src);
                            resolve(); // no bloquear la carga de la página
                        };
                        document.head.appendChild(script);
                    });
                } else {
                    // Ejecutar script inline creando un nuevo elemento <script>
                    const inline = document.createElement('script');
                    if (s.type) inline.type = s.type;
                    inline.text = s.textContent;
                    document.head.appendChild(inline);
                    // No necesitamos esperar, su ejecución es inmediata
                }
            } catch (err) {
                console.error('Error ejecutando script incluido:', err);
            }
        }
    }
}

customElements.define("include-html", IncludeHTML);
