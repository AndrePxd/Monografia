import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Swal from "sweetalert2";
import { authFetch } from "../utils/authFetch";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [role, setRole] = useState("Jurado");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== repeatPassword) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Las contraseñas no coinciden",
        confirmButtonColor: "#9E62B2",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("http://localhost:8081/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: role.toUpperCase() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error creando la cuenta");
      }

      const data = await res.json();

      Swal.fire({
        icon: "success",
        title: "¡Registro exitoso!",
        text: `Cuenta creada para ${data.username} con rol ${data.role}`,
        confirmButtonText: "Ir al inicio de sesión",
        confirmButtonColor: "#9E62B2",
      }).then(() => {
        navigate("/"); // 🔹 Redirigir al login
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error en registro",
        text: err.message || "No se pudo crear la cuenta",
        confirmButtonColor: "#9E62B2",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-center mb-1">Crear cuenta</h1>
      <p className="text-center text-gray-600 mb-6">Sistema de votación</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium mb-1">USUARIO</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="john"
            required
            className="w-full border rounded px-3 py-2 focus:outline-purple-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">CONTRASEÑA</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
            className="w-full border rounded px-3 py-2 focus:outline-purple-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            REPITA LA CONTRASEÑA
          </label>
          <input
            type="password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder="********"
            required
            className="w-full border rounded px-3 py-2 focus:outline-purple-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">ROL</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value.toUpperCase())}
            className="w-full border rounded px-3 py-2 focus:outline-purple-600"
          >
            <option value="JURADO">Jurado</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#9E62B2] text-white py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Creando..." : "CREAR CUENTA"}
        </button>

        <Link
          to="/"
          className="block text-center text-sm text-[#9E62B2] hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </form>
    </AuthLayout>
  );
}
