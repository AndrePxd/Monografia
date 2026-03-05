import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Papa from "papaparse";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AdminLayout from "../components/AdminLayout";
import { authFetch } from "../utils/authFetch";
import {
  User,
  Users,
  FileDown,
  FileUp,
  Settings,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface Padron {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  username: string;
  mesa?: number;
}

interface Candidato {
  nombre: string;
  photoUrl?: string;
  colorHex?: string;
  slogan?: string;
}

export default function ElectionConfigPage() {
  const [padrones, setPadrones] = useState<Padron[]>([]);
  const [selectedPadron, setSelectedPadron] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [mesasCount, setMesasCount] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [jurados, setJurados] = useState<Usuario[]>([]);
  const [searchResults, setSearchResults] = useState<Usuario[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);

  // === Cargar padrones del admin logueado ===
  useEffect(() => {
    const fetchPadrones = async () => {
      try {
        const res = await authFetch(
          `http://localhost:8081/api/elections/padrones/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Error al cargar padrones");
        const data = await res.json();
        setPadrones(data);
      } catch {
        Swal.fire("Error", "No se pudieron cargar los padrones", "error");
      }
    };
    if (user.id) fetchPadrones();
  }, [user.id, token]);

  // === Obtener número de mesas ===
  useEffect(() => {
    const fetchMesasCount = async () => {
      if (!selectedPadron) return;
      try {
        const res = await authFetch(
          `http://localhost:8081/api/elections/padron/${selectedPadron}/mesas/count`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Error al contar mesas");
        const data = await res.json();
        setMesasCount(data.mesasCount || 1);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: `El padrón tiene ${data.mesasCount} mesas.`,
          showConfirmButton: false,
          timer: 2000,
        });
      } catch {
        setMesasCount(1);
        Swal.fire("Error", "No se pudo obtener el número de mesas.", "error");
      }
    };
    fetchMesasCount();
  }, [selectedPadron, token]);

  // === Buscar jurados ===
  useEffect(() => {
    const fetchJurados = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await authFetch(
          `http://localhost:8081/api/users/search?username=${searchTerm}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const juradosOnly = data.filter(
            (u: any) =>
              u.role === "JURADO" &&
              u.username !== user.username &&
              !jurados.some((j) => j.id === u.id)
          );
          setSearchResults(juradosOnly);
        }
      } catch {
        setSearchResults([]);
      }
    };
    const delay = setTimeout(fetchJurados, 400);
    return () => clearTimeout(delay);
  }, [searchTerm, token, user.username, jurados]);

  // === Agregar / eliminar jurado ===
const addJurado = (jurado: Usuario) => {
  if (jurados.find((j) => j.id === jurado.id)) return;

  // 🚫 Validación: no permitir más jurados que mesas
  if (jurados.length >= mesasCount) {
    Swal.fire({
      icon: "warning",
      title: "Todas las mesas ya tienen jurado",
      text: `Solo se permiten ${mesasCount} jurados para las ${mesasCount} mesas.`,
      confirmButtonColor: "#9E62B2",
    });
    return;
  }

  setJurados([...jurados, jurado]);
  setSearchTerm("");
  setSearchResults([]);
};

  const removeJurado = (id: number) => {
    setJurados(jurados.filter((j) => j.id !== id));
  };

  // === Sortear mesas ===
  const sortearMesas = () => {
    if (jurados.length === 0) {
      Swal.fire("Atención", "Agrega al menos un jurado antes de sortear.", "warning");
      return;
    }
    const shuffled = [...jurados].sort(() => 0.5 - Math.random());
    const asignados = shuffled.map((j, i) => ({
      ...j,
      mesa: (i % mesasCount) + 1,
    }));
    setJurados(asignados);
    Swal.fire("Éxito", "Las mesas fueron asignadas aleatoriamente.", "success");
  };

  // === Descargar plantilla candidatos ===
  const downloadTemplate = () => {
    const csv =
      "nombre,photoUrl,colorHex,slogan\nJuan Panique,,#FF0000,Por una mejor universidad\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_candidatos.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // === Cargar CSV de candidatos ===
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data.map((row: any) => ({
          nombre: row.nombre?.trim(),
          photoUrl: row.photoUrl?.trim() || "",
          colorHex: row.colorHex?.trim() || "",
          slogan: row.slogan?.trim() || "",
        }));
        setCandidatos(parsed);
        Swal.fire("Éxito", `Se cargaron ${parsed.length} candidatos.`, "success");
      },
      error: (err) => {
        Swal.fire("Error", `Error al leer CSV: ${err.message}`, "error");
      },
    });
  };
  const formatLocalDateTime = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

  // === Registrar elección ===
  const registerElection = async () => {
    if (!selectedPadron || !name || !startDateTime || !endDateTime) {
      Swal.fire("Atención", "Completa todos los campos antes de registrar.", "warning");
      return;
    }

    if (candidatos.length === 0) {
      Swal.fire("Atención", "Debes cargar al menos un candidato.", "warning");
      return;
    }

    if (jurados.length < mesasCount) {
      Swal.fire(
        "Atención",
        `Debes asignar un jurado por cada mesa (${mesasCount}).`,
        "warning"
      );
      return;
    }
    const mesasSinAsignar = jurados.some((j) => !j.mesa);
    if (mesasSinAsignar) {
      Swal.fire(
        "Atención",
        "Debes sortear las mesas antes de registrar la elección.",
        "warning"
      );
      return;
    }

    try {
      setLoading(true);
      

      const payload = {
        name,
        startDateTime: formatLocalDateTime(startDateTime),
        endDateTime: formatLocalDateTime(endDateTime),
        mesasCount,
        padronId: selectedPadron,
        jurados: jurados.map((j) => ({ id: j.id, mesa: j.mesa })),
        candidatos: candidatos.map((c) => ({
          nombre: c.nombre,
          photoUrl: c.photoUrl,
          colorHex: c.colorHex,
          slogan: c.slogan,
        })),
      };

      const res = await authFetch("http://localhost:8081/api/elections/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Error al registrar elección");

      Swal.fire({
        icon: "success",
        title: "Elección registrada correctamente",
        html: `
          <div style="text-align:left; font-size:14px;">
            <p><b>Nombre:</b> ${data.name || name}</p>
            <p><b>Mesas creadas:</b> ${mesasCount}</p>
            <p><b>Candidatos registrados:</b> ${candidatos.length}</p>
          </div>
        `,
        confirmButtonColor: "#9E62B2",
      });

      setJurados([]);
      setName("");
      setSelectedPadron(null);
      setCandidatos([]);
      setStartDateTime(null);
      setEndDateTime(null);
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-[#4A306D]">
          <Settings className="w-8 h-8 text-[#9E62B2]" /> Configuración de elección
        </h2>

        {/* === Lista de padrones === */}
        <h3 className="font-semibold mb-3 text-gray-700">
          Lista de padrones para configurar
        </h3>
        {padrones.length === 0 ? (
          <p className="text-gray-500">No tienes padrones registrados todavía.</p>
        ) : (
          <div className="space-y-3 mb-8">
            {padrones.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-[#F9F7FB] border border-gray-200 rounded-xl px-5 py-3 hover:shadow-md transition"
              >
                <span className="font-medium text-gray-700">{p.nombre}</span>
                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition ${
                    selectedPadron === p.id
                      ? "bg-[#7AFC78] text-black"
                      : "bg-[#E0FA8B] hover:bg-[#C5F262]"
                  }`}
                  onClick={() => setSelectedPadron(p.id)}
                >
                  <Settings className="w-4 h-4" />
                  {selectedPadron === p.id ? "Seleccionado" : "Configurar"}
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedPadron && (
          <>
            {/* === Datos generales === */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Nombre de la elección
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Centro de Estudiantes 2025"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm focus:ring-2 focus:ring-[#8BF3FA] focus:border-[#8BF3FA] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Fecha de inicio
                </label>
                <DatePicker
                  selected={startDateTime}
                  onChange={(date) => setStartDateTime(date)}
                  showTimeSelect
                  timeIntervals={1}
                  dateFormat="dd/MM/yyyy h:mm aa"
                  placeholderText="Selecciona fecha y hora"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm focus:ring-2 focus:ring-[#8BF3FA] focus:border-[#8BF3FA] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Fecha de cierre
                </label>
                <DatePicker
                  selected={endDateTime}
                  onChange={(date) => setEndDateTime(date)}
                  showTimeSelect
                  timeIntervals={1}
                  dateFormat="dd/MM/yyyy h:mm aa"
                  placeholderText="Selecciona fecha y hora"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm focus:ring-2 focus:ring-[#8BF3FA] focus:border-[#8BF3FA] transition-all"
                />
              </div>

              
                {/* === Campo solo lectura: cantidad de mesas === */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Cantidad de mesas
                </label>
                <input
                  type="number"
                  value={mesasCount}
                  readOnly
                  className="w-full border border-gray-300 bg-gray-100 rounded-lg px-4 py-2.5 shadow-sm text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            

            {/* === Jurados === */}
            <h3 className="font-semibold mb-2 text-gray-800">Agregar jurado</h3>
            <div className="relative mb-5">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar jurado (solo rol JURADO)..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm focus:ring-2 focus:ring-[#8BF3FA] focus:border-[#8BF3FA] transition-all"
              />
              {searchResults.length > 0 && (
                <ul className="absolute z-10 bg-white border w-full rounded-lg shadow-lg mt-1 max-h-48 overflow-auto">
                  {searchResults.map((u) => (
                    <li
                      key={u.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                      onClick={() => addJurado(u)}
                    >
                      <User className="w-4 h-4 text-gray-600" />
                      {u.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {jurados.length > 0 && (
              <div className="bg-[#F9F7FB] p-4 rounded-xl mb-5 border border-gray-200">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-[#4A306D]">
                  <Users className="w-4 h-4 text-[#9E62B2]" /> Lista de jurados
                </h4>
                <ul className="space-y-2">
                  {jurados.map((j) => (
                    <li
                      key={j.id}
                      className="flex justify-between items-center bg-white border rounded-lg p-2 shadow-sm hover:bg-[#F3F0FA] transition"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-600" />
                        <span>{j.username}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {j.mesa && (
                          <span className="text-sm text-gray-600">Mesa {j.mesa}</span>
                        )}
                        <button
                          onClick={() => removeJurado(j.id)}
                          className="flex items-center gap-1 bg-[#EC4458] text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

<div className="flex justify-end">
  <button
    onClick={sortearMesas}
    className="flex items-center gap-2 bg-[#8BF3FA]/50 px-4 py-2 rounded-lg hover:bg-[#8BF3FA]/80 transition font-medium mb-8 text-[#004F54]"
  >
    <RefreshCw className="w-4 h-4" /> Sortear mesas
  </button>
</div>

            {/* === Candidatos === */}
            <h3 className="font-semibold mb-3 text-gray-800">Cargar candidatos</h3>
            <div className="flex gap-3 mb-6">
              <label className="flex items-center gap-2 bg-[#8BF3FA]/50 text-[#004F54] px-4 py-2 rounded-lg cursor-pointer hover:bg-[#8BF3FA]/80 transition font-medium">
                <FileUp className="w-4 h-4" /> Cargar CSV
                <input type="file" accept=".csv" hidden onChange={handleUpload} />
              </label>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-[#8BF3FA]/50 text-[#004F54] px-4 py-2 rounded-lg hover:bg-[#8BF3FA]/80 transition font-medium"
              >
                <FileDown className="w-4 h-4" /> Descargar plantilla
              </button>
                       <button
  onClick={() =>
    Swal.fire({
      title: "Guía para completar CSV de candidatos",
      html: `
        <ul style="text-align:left; font-size:14px; line-height:1.5">
          <li><b>nombre:</b> Nombre del candidato — Ej: Juan Pérez</li>
          <li><b>photoUrl:</b> URL de la foto (opcional)</li>
          <li><b>colorHex:</b> Color en formato HEX — Ej: #FF0000</li>
          <li><b>slogan:</b> Frase o lema del candidato</li>
        </ul>
        <p style="margin-top:10px; font-size:12px; color:#777">
          ⚠️ No modifiques los nombres de las columnas.
        </p>
      `,
      confirmButtonColor: "#9E62B2",
    })
  }
  className="flex items-center gap-2 bg-[#E6D6FA]/60 text-[#4A306D] font-medium px-3 py-2 rounded-lg hover:bg-[#E6D6FA]/80 transition"
>
  <Settings className="w-4 h-4" />
  ¿Cómo llenar?
</button>
              
            </div>





            {candidatos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {candidatos.map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                  >
                    <p className="font-semibold text-[#4A306D] text-lg">
                      {c.nombre}
                    </p>
                    <p className="text-sm text-gray-600 italic mt-1">
                      “{c.slogan || "Sin eslogan"}”
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* === Botones finales === */}
            <div className="flex justify-end gap-3">
              <button
                onClick={registerElection}
                disabled={loading}
                className="flex items-center gap-2 bg-[#9E62B2] text-white px-5 py-2.5 rounded-lg hover:bg-[#864fa0] disabled:opacity-50 transition font-medium"
              >
                <Settings className="w-4 h-4" />
                {loading ? "Registrando..." : "Registrar elección"}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                <RefreshCw className="w-4 h-4" /> Cancelar
              </button>
            </div>
          </>
        )}

        <p className="text-sm text-gray-500 mt-8 italic">
          * Los parámetros de seguridad (QR únicos y hash en actas) se aplican automáticamente y no requieren configuración manual.
        </p>
      </div>
    </AdminLayout>
  );
}
