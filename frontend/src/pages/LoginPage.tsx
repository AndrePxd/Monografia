import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Swal from "sweetalert2";
import { authFetch } from "../utils/authFetch";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authFetch("http://localhost:8081/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Credenciales inválidas");
      }

      const data = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          username: data.username,
          role: data.role,
        })
      );


     Swal.fire({
        icon: "success",
        title: "Bienvenido",
        text: `Has iniciado sesión como ${data.username} (Rol: ${data.role})`,
        confirmButtonColor: "#9E62B2",
      }).then(() => {
        if (data.role === "ADMIN") {
          navigate("/voters/upload");
        } else if (data.role === "JURADO") {
          navigate("/elections/jurado"); 
        } else {
          navigate("/"); // fallback
        }
      });

    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error en login",
        text: err.message || "No se pudo iniciar sesión",
        confirmButtonColor: "#9E62B2",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-center mb-1">Inicio de sesión</h1>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#9E62B2] text-white py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "INGRESAR"}
        </button>

        <div className="text-center text-sm text-gray-500">o</div>

        <Link
          to="/register"
          className="w-full block bg-[#9E62B2] text-white py-2 rounded font-semibold text-center"
        >
          CREAR CUENTA
        </Link>
      </form>
    </AuthLayout>
  );
}
