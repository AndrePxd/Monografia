import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Users, Settings, FileBarChart, UserCircle } from "lucide-react";

interface Election {
  id: number;
  name: string;
  status: string; // DRAFT | OPEN | CLOSED
}

export default function AdminSidebar() {
  const [elections, setElections] = useState<Election[]>([]);
  const token = localStorage.getItem("token");
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user")!)
      : null;

    if (!user) return;

    fetch(`http://localhost:8081/api/elections/admin/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Error al cargar elecciones");
        }
        return res.json();
      })
      .then(setElections)
      .catch((err) => {
        console.error("Error al cargar elecciones:", err);
        setElections([]);
      });
  }, []);

  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : { username: "Usuario" };

  return (
    <aside
      className="
        w-64
        bg-white
        border-r
        fixed
        top-0
        left-0
        h-screen
        flex
        flex-col
        shadow-md
        z-50
      "
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b bg-[#F9F8FB]">
        <h1 className="text-xl font-bold text-[#9E62B2] tracking-wide">VTU</h1>
      </div>

      {/* Elección actual */}
      <div className="p-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-150 h-150 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
            {"Bienvenido "+user.username.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Sistema de Elecciones</p>
          </div>
        </div>
      </div>

      {/* Menú principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-xs uppercase text-gray-500 mb-2">Menú principal</p>
        <ul className="space-y-1">
          <li>
            <Link
              to="/voters/upload"
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                location.pathname === "/voters/upload"
                  ? "bg-[#E2E8F0] text-[#9E62B2] font-semibold"
                  : "text-gray-700 hover:bg-[#F5F3FA] hover:text-[#9E62B2]"
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Gestión de padrón</span>
            </Link>
          </li>
          <li>
            <Link
              to="/elections/config"
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                location.pathname.includes("/elections/config")
                  ? "bg-[#E2E8F0] text-[#9E62B2] font-semibold"
                  : "text-gray-700 hover:bg-[#F5F3FA] hover:text-[#9E62B2]"
              }`}
            >
              <Settings className="w-5 h-5" />
              Configuración de elección
            </Link>
          </li>
          <li>
            <Link
              to="/elections/reports"
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                location.pathname.includes("/reports")
                  ? "bg-[#E2E8F0] text-[#9E62B2] font-semibold"
                  : "text-gray-700 hover:bg-[#F5F3FA] hover:text-[#9E62B2]"
              }`}
            >
              <FileBarChart className="w-5 h-5" />
              Reportes
            </Link>
          </li>
        </ul>

        {/* Listado de elecciones */}
        <div className="mt-6">
          <p className="text-xs uppercase text-gray-500 mb-2">
            Listado de elecciones
          </p>
          <ul className="space-y-1 text-sm">
            {elections.map((e) => (
              <li key={e.id}>
                <span
                  className={`block px-3 py-1 rounded cursor-default ${
                    e.status === "CLOSED"
                      ? "text-[#dc7676]"
                      : e.status === "OPEN"
                      ? "text-[#00bb2d]"
                      : "text-[#69b5dd]"
                  }`}
                >
                  {e.name}{" "}
                  {e.status === "CLOSED"
                    ? "Finalizada"
                    : e.status === "OPEN"
                    ? "Abierta"
                    : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Usuario */}
      <div className="p-4 border-t flex items-center gap-3 bg-[#F9F8FB]">
        <UserCircle className="w-8 h-8 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {user.username}
        </span>
      </div>
    </aside>
  );
}
