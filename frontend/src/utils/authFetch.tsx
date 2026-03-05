import Swal from "sweetalert2";

/**
 * fetch autenticado con manejo global de expiración de token
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

        const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        };

        // si el body NO es FormData, entonces se pone content-type json
        if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        }


  try {
    const response = await fetch(url, { ...options, headers });

    // Si el token expiró o no es válido
    if (response.status === 401 || response.status === 403) {
      await Swal.fire({
        icon: "warning",
        title: "Sesión expirada",
        text: "Tu sesión ha caducado. Por favor, inicia sesión nuevamente.",
        confirmButtonColor: "#9E62B2",
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
      return Promise.reject("Sesión expirada");
    }

    return response;
  } catch (err) {
    console.error("Error en authFetch:", err);
    throw err;
  }
}
