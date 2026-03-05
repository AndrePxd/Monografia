import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../utils/authFetch";
import Swal from "sweetalert2";
import { PenSquareIcon, Search, UserCircle2, RefreshCcw } from "lucide-react";

interface Voter {
  id: number;
  docId: string;
  fullName: string;
  program: string;
  mesaCode: string;
  enabled: boolean;
  acreditado?: boolean;
  puedeReacreditar?: boolean;
}

interface Election {
  id: number;
  name: string;
  status: string;
}

export default function JuradoPadronPage() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  const [voters, setVoters] = useState<Voter[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  /** === Cargar elección y padrón del jurado === */
  const fetchData = async () => {
    try {
      setLoading(true);

      const resElection = await authFetch(
        `http://localhost:8081/api/elections/${electionId}`
      );
      if (!resElection.ok) throw new Error("Error al obtener la elección");
      const electionData = await resElection.json();
      setElection(electionData);

      const res = await authFetch(
        `http://localhost:8081/api/jurado/padron/acreditado/${electionId}/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error al cargar padrón");
      const data = await res.json();
      setVoters(data);
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [electionId, user.id, token]);

  /** === Acreditar / Reacreditar votante === */
  const handleAcreditar = async (voterId: number, reacreditar = false) => {
    if (!election || election.status !== "OPEN") {
      Swal.fire(
        "Atención",
        "Solo se puede acreditar cuando la elección está en curso.",
        "warning"
      );
      return;
    }

    try {
      const endpoint = reacreditar ? "reacreditar" : "acreditar";
      const res = await authFetch(
        `http://localhost:8081/api/jurado/${endpoint}/${electionId}/${voterId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.details?.includes("vigente") || data.error?.includes("vigente")) {
          Swal.fire(
            "QR activo",
            "El votante ya tiene un QR vigente. No es necesario reacreditarlo.",
            "info"
          );
          return;
        }
        throw new Error(data.error || "Error al acreditar");
      }

      Swal.fire({
        icon: "success",
        title: reacreditar ? "Reacreditación exitosa" : "Acreditación exitosa",
        text: data.message,
        confirmButtonColor: "#4A306D",
      }).then(() => {
        if (data.token) {
          navigate(`/qr/${electionId}/${data.token}`);
        } else {
          fetchData();
        }
      });

      await fetchData();
    } catch (err: any) {
      Swal.fire(
        "Error",
        reacreditar
          ? "Error al reacreditar votante."
          : "Error al acreditar votante.",
        "error"
      );
    }
  };

  /** === Filtro de búsqueda === */
  const filtered = voters.filter(
    (v) =>
      v.fullName.toLowerCase().includes(search.toLowerCase()) ||
      v.docId.includes(search)
  );

  /** === Totales === */
  const totalHabilitados = voters.filter((v) => v.enabled).length;
  const totalInhabilitados = voters.filter((v) => !v.enabled).length;
  const totalAcreditados = voters.filter(
    (v) => v.acreditado || v.puedeReacreditar
  ).length;
  const totalNoAcreditados = voters.filter(
    (v) => !v.acreditado && !v.puedeReacreditar
  ).length;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg">
      {/* === Header === */}
      <div className="flex justify-between items-center mb-6 border-b pb-3">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-[#4A306D]">
          <PenSquareIcon className="w-7 h-7 text-[#9E62B2]" />
          Padrón Electoral - Jurado de Mesa
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1 text-sm text-[#4A306D] hover:text-[#6E48A3]"
          >
            <RefreshCcw className="w-5 h-5" /> Actualizar
          </button>
          <div className="flex items-center gap-2">
            <UserCircle2 className="w-8 h-8 text-gray-500" />
            <span className="font-medium text-gray-700">{user.username}</span>
          </div>
        </div>
      </div>

      {/* === Encabezado con nombre de elección y estado === */}
{election && (
  <div className="mb-8 bg-[#F9F7FB] border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
    <div>
      <h2 className="text-2xl font-bold text-[#4A306D] mb-1">
        {election.name}
      </h2>
      <p className="text-sm text-gray-600">
        Padron asignado al jurado{" "}
        <span className="font-semibold text-[#4A306D]">{user.username}</span>
      </p>
    </div>
    <div>
      {election.status === "OPEN" && (
        <span className="px-4 py-2 rounded-full bg-[#A7E6A3] text-green-800 font-semibold text-sm">
          🟢 Abierta
        </span>
      )}
      {election.status === "PENDING" && (
        <span className="px-4 py-2 rounded-full bg-[#A3D8F4] text-blue-800 font-semibold text-sm">
          🔵 Pendiente
        </span>
      )}
      {election.status === "CLOSED" && (
        <span className="px-4 py-2 rounded-full bg-[#F4B3B3] text-red-800 font-semibold text-sm">
          🔴 Cerrada
        </span>
      )}
    </div>
  </div>
)}

      {/* === Tarjetas de totales === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">Habilitados</p>
          <p className="text-2xl font-bold text-green-700">{totalHabilitados}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-800">Inhabilitados</p>
          <p className="text-2xl font-bold text-red-700">{totalInhabilitados}</p>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-cyan-800">Acreditados</p>
          <p className="text-2xl font-bold text-cyan-700">{totalAcreditados}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-yellow-800">No acreditados</p>
          <p className="text-2xl font-bold text-yellow-700">{totalNoAcreditados}</p>
        </div>
      </div>

      {/* === Buscador === */}
      <div className="relative mb-6 w-80">
        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre o carnet..."
          className="border border-gray-300 rounded-lg pl-10 pr-3 py-2 w-full focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* === Tabla === */}
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-[#F3F0FA] text-[#4A306D] uppercase text-xs font-semibold">
          <tr>
            <th className="px-3 py-3">Carnet</th>
            <th className="px-3 py-3">Nombre</th>
            <th className="px-3 py-3">Carrera</th>
            <th className="px-3 py-3">Mesa</th>
            <th className="px-3 py-3">Estado</th>
            <th className="px-3 py-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center py-6 text-gray-500">
                Cargando...
              </td>
            </tr>
          ) : (
            filtered.map((v) => {
              let estadoTexto = "";
              let estadoColor = "";

              if (!v.enabled) {
                estadoTexto = "Inhabilitado / No acreditado";
                estadoColor = "bg-red-100 text-red-700";
              } else if (v.acreditado && !v.puedeReacreditar) {
                estadoTexto = "Habilitado / Acreditado";
                estadoColor = "bg-green-100 text-green-700";
              } else if (v.puedeReacreditar) {
                estadoTexto = "Habilitado / Expirado (reacreditable)";
                estadoColor = "bg-yellow-100 text-yellow-700";
              } else {
                estadoTexto = "Habilitado / No acreditado";
                estadoColor = "bg-gray-100 text-gray-700";
              }

              return (
                <tr key={v.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-3 py-3">{v.docId}</td>
                  <td className="px-3 py-3">{v.fullName}</td>
                  <td className="px-3 py-3">{v.program}</td>
                  <td className="px-3 py-3">{v.mesaCode}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`${estadoColor} px-3 py-1 rounded-full text-xs font-medium`}
                    >
                      {estadoTexto}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center flex justify-center gap-2">
                    {/* Acreditar */}
                    <button
                      disabled={
                        !v.enabled || election?.status !== "OPEN" || v.acreditado
                      }
                      onClick={() => handleAcreditar(v.id, false)}
                      className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                        !v.enabled
                          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                          : v.acreditado
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : "bg-[#8BF3FA] text-black hover:bg-sky-400"
                      }`}
                    >
                      {v.acreditado ? "Acreditado" : "Acreditar"}
                    </button>

                    {/* Reacreditar */}
                    <button
                      disabled={
                        !v.enabled ||
                        election?.status !== "OPEN" ||
                        !v.puedeReacreditar
                      }
                      onClick={() => handleAcreditar(v.id, true)}
                      className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                        !v.enabled || !v.puedeReacreditar
                          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                          : "bg-[#EBE277] text-black hover:bg-yellow-400"
                      }`}
                    >
                      Reacreditar
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
