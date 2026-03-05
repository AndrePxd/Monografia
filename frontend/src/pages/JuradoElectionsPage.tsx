import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import { Search, Filter, List } from "lucide-react";
import Swal from "sweetalert2";
import JuradoLayout from "../components/JuradoLayout";

interface Election {
  id: number;
  name: string;
  startDateTime: string;
  endDateTime: string;
  status: string; // PENDING | OPEN | CLOSED
}

export default function JuradoElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [filtered, setFiltered] = useState<Election[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODAS");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchElections = async () => {
      if (!user.id) return;

      try {
        setLoading(true);
        const res = await authFetch(
          `http://localhost:8081/api/elections/jurados/${user.id}/elections`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 401 || res.status === 403) {
          Swal.fire({
            icon: "warning",
            title: "Sesión expirada",
            text: "Por favor vuelve a iniciar sesión.",
            confirmButtonText: "Ir al login",
            confirmButtonColor: "#9E62B2",
          }).then(() => {
            localStorage.clear();
            window.location.href = "/login";
          });
          return;
        }

        if (!res.ok) throw new Error("Error al cargar elecciones del jurado");

        const data = await res.json();
        setElections(data);
        setFiltered(data);
      } catch (err) {
        Swal.fire("Error", "No se pudieron cargar tus elecciones", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, [user.id, token]);

  // === Filtro de búsqueda y estado ===
  useEffect(() => {
    let results = elections.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filter !== "TODAS") {
      results = results.filter((e) => e.status === filter);
    }
    setFiltered(results);
  }, [search, filter, elections]);

  // === Mapeo visual de estados ===
  const statusLabel = {
    PENDING: { text: "Pendiente", color: "bg-[#A3D8F4]" },
    OPEN: { text: "Abierta", color: "bg-[#A7E6A3]" },
    CLOSED: { text: "Finalizada", color: "bg-[#FCA5A5]" },
  } as const;

  return (
    <JuradoLayout>
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        {/* === Header === */}
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-[#4A306D]">
            <List className="w-7 h-7 text-[#9E62B2]" />
            Lista de Elecciones Asignadas
          </h1>
        </div>

        {/* === Filtros === */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar elección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-3 py-2 w-full rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-[#9E62B2] focus:border-[#9E62B2] transition-all outline-none"
            />
          </div>

          {/* Filtro */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-500 w-5 h-5" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9E62B2] bg-white"
            >
              <option value="TODAS">Todas</option>
              <option value="PENDING">Pendiente</option>
              <option value="OPEN">Abierta</option>
              <option value="CLOSED">Finalizada</option>
            </select>
          </div>
        </div>

        {/* === Tabla === */}
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-md">
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-[#F3F0FA] text-[#4A306D] uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-center">Inicio</th>
                <th className="px-4 py-3 text-center">Fin</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500">
                    Cargando elecciones...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t hover:bg-gray-50 transition-all"
                  >
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-center">
                      {new Date(e.startDateTime).toLocaleString("es-BO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {new Date(e.endDateTime).toLocaleString("es-BO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs font-semibold text-black px-3 py-1 rounded-full ${
                          statusLabel[e.status as keyof typeof statusLabel]
                            ?.color || "bg-gray-300"
                        }`}
                      >
                        {
                          statusLabel[e.status as keyof typeof statusLabel]
                            ?.text || "Desconocido"
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          (window.location.href = `/jurado/padron/${e.id}`)
                        }
                        className="bg-[#8BF3FA] hover:bg-[#6FE0EA] text-black px-4 py-1.5 rounded-md font-medium transition-all"
                      >
                        Ver elección
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-6 text-gray-500 italic"
                  >
                    No se encontraron elecciones asignadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </JuradoLayout>
  );
}
