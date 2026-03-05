import { useState, useMemo } from "react";
import Swal from "sweetalert2";
import Papa from "papaparse";
import AdminLayout from "../components/AdminLayout";
import { authFetch } from "../utils/authFetch";
import {
  Search,
  FileUp,
  FileDown,
  Users,
  BarChart3,
  UserCheck,
  UserX,
  HelpCircle 
} from "lucide-react";

interface Voter {
  docId: string;
  fullName: string;
  program: string;
  mesaCode: string;
  enabled: boolean;
  rawEnabled?:string;
}

const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export default function VoterManagementPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [stats, setStats] = useState({ total: 0, enabled: 0, disabled: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const votersPerPage = 15;
  const token = localStorage.getItem("token");

  // 📁 Cargar CSV
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    encoding: "ISO-8859-1",
    transformHeader: (header) =>
      header
        .replace(/\uFEFF/g, "") // limpia caracteres invisibles
        .trim(), // elimina espacios sobrantes
    complete: (result) => {
      // 🔹 Limpieza de filas para evitar espacios invisibles
      const cleanedData = result.data.map((row: any) => {
        const cleanRow: any = {};
        Object.keys(row).forEach((key) => {
          const cleanKey = key.replace(/\uFEFF/g, "").trim();
          cleanRow[cleanKey] = row[key];
        });
        return cleanRow;
      });

      // 🔹 Mapeo principal
      const parsed: Voter[] = cleanedData.map((row: any) => ({
        docId: row.docId?.trim() || "",
        fullName: row.fullName?.trim() || "",
        program: row.program?.trim() || "",
        mesaCode: row.mesaCode?.trim() || "",
        enabled: row.enabled?.toString().toLowerCase() === "true",
        rawEnabled: row.enabled?.toString().toLowerCase() || "",
      }));

      // === 🔍 VALIDACIONES BÁSICAS ===
      const errores: string[] = [];
      const seenIds = new Set<string>();
      const duplicados: string[] = [];

      parsed.forEach((v, i) => {
        const fila = i + 2; // fila real en el CSV (contando encabezado)
        const faltantes: string[] = [];

        if (!v.docId) faltantes.push("docId");
        if (!v.fullName) faltantes.push("fullName");
        if (!v.program) faltantes.push("program");
        if (!v.mesaCode) faltantes.push("mesaCode");

        if (faltantes.length > 0) {
          errores.push(`Fila ${fila}: faltan los campos ${faltantes.join(", ")}.`);
        }

        if (v.mesaCode && isNaN(Number(v.mesaCode))) {
          errores.push(`Fila ${fila}: el campo mesaCode debe ser numérico (Ej: 1, 2, 3).`);
        }

        if (v.rawEnabled && !["true", "false"].includes(v.rawEnabled)) {
          errores.push(`Fila ${fila}: el campo enabled debe ser true o false (no "${v.rawEnabled}").`);
        }

        if (v.docId) {
          if (seenIds.has(v.docId)) {
            duplicados.push(v.docId);
          } else {
            seenIds.add(v.docId);
          }
        }
      });

      if (duplicados.length > 0) {
        const unicos = [...new Set(duplicados)];
        errores.push(`Se encontraron ${unicos.length} duplicados por número de documento: ${unicos.join(", ")}.`);
      }

      // ⚠️ Mostrar errores si existen
      if (errores.length > 0) {
        Swal.fire({
          icon: "warning",
          title: "Archivo con observaciones",
          html: `
            <div style="text-align:left; max-height:220px; overflow:auto; font-size:14px; line-height:1.5;">
              ${errores.map((e) => `<div>• ${e}</div>`).join("")}
            </div>
            <p style="margin-top:12px; font-size:12px; color:#666">
              Corrige estos problemas antes de registrar el padrón.
            </p>
          `,
          confirmButtonColor: "#9E62B2",
        });
        return;
      }

      // ✅ Si pasa validaciones
      setVoters(parsed);
      const enabledCount = parsed.filter((v) => v.enabled).length;
      setStats({
        total: parsed.length,
        enabled: enabledCount,
        disabled: parsed.length - enabledCount,
      });

      Swal.fire("Éxito", `Se cargaron ${parsed.length} registros correctamente.`, "success");
    },
    error: (err) => {
      Swal.fire("Error", `Error al leer CSV: ${err.message}`, "error");
    },
  });
};


  // 📤 Registrar padrón
  const registerPadron = async () => {
    if (voters.length === 0) {
      Swal.fire("Atención", "No hay registros cargados para registrar.", "warning");
      return;
    }

    const { value: nombrePadron } = await Swal.fire({
      title: "Registrar padrón",
      input: "text",
      inputLabel: "Ingrese el nombre del padrón",
      inputPlaceholder: "Ejemplo: Padrón 2025 - Facultad Ingeniería",
      showCancelButton: true,
      confirmButtonText: "Registrar",
      confirmButtonColor: "#9E62B2",
      cancelButtonText: "Cancelar",
    });

    if (!nombrePadron) return;

    try {
      setLoading(true);
      const csv = Papa.unparse(voters);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const formData = new FormData();
      formData.append("file", blob, "padron.csv");
      formData.append("nombrePadron", nombrePadron);

      const res = await authFetch("http://localhost:8081/api/voters/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Error al registrar padrón");
      const data = await res.json();

      Swal.fire({
        icon: "success",
        title: "Padrón procesado correctamente",
        html: `
          <div style="text-align:left; font-size:14px;">
            <p><b>Nombre:</b> ${data.nombrePadron}</p>
            <p><b>Total procesados:</b> ${data.totalProcesados}</p>
            <hr/>
            <p style="margin-top:8px;">
              Se procesaron correctamente los ${data.totalProcesados} registros.
            </p>
          </div>
        `,
        confirmButtonColor: "#9E62B2",
      });

      setVoters([]);
      setStats({ total: 0, enabled: 0, disabled: 0 });
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // 📥 Descargar plantilla
  const downloadTemplate = () => {
    const csv =
      "docId,fullName,program,mesaCode,enabled\n12345678,Juan Panique,Ing. Sistemas,1,true\n 12345678,Pepe Panique,Ing. Sistemas,1,false";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_votantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🔍 Filtro de búsqueda optimizado
  const filteredVoters = useMemo(() => {
    const term = normalizeText(searchTerm);
    if (!term) return voters;
    return voters.filter(
      (v) =>
        normalizeText(v.fullName).includes(term) ||
        normalizeText(v.docId).includes(term) ||
        normalizeText(v.program).includes(term)
    );
  }, [searchTerm, voters]);

  // 📄 Paginación
  const totalPages = Math.ceil(filteredVoters.length / votersPerPage);
  const indexOfLast = currentPage * votersPerPage;
  const indexOfFirst = indexOfLast - votersPerPage;
  const currentVoters = filteredVoters.slice(indexOfFirst, indexOfLast);

  return (
    <AdminLayout>
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 text-[#4A306D]">
          <Users className="w-8 h-8 text-[#9E62B2]" /> Gestión de padrón
        </h1>

        {/* Controles superiores */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 bg-[#8BF3FA]/40 text-[#004F54] font-medium px-4 py-2 rounded-lg cursor-pointer hover:bg-[#8BF3FA]/60 transition">
              <FileUp className="w-4 h-4" /> Cargar CSV
              <input type="file" accept=".csv" onChange={handleUpload} hidden />
            </label>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 bg-[#8BF3FA]/40 text-[#004F54] font-medium px-4 py-2 rounded-lg hover:bg-[#8BF3FA]/60 transition"
            >
              <FileDown className="w-4 h-4" /> Descargar plantilla
            </button>

         <button
  onClick={() =>
    Swal.fire({
      title: "Guía para completar CSV",
      html: `
        <ul style="text-align:left; font-size:14px; line-height:1.5">
          <li><b>docId:</b> Carnet o documento — Ej: 12345678</li>
          <li><b>fullName:</b> Nombre completo — Ej: Juan Pérez Gutiérrez</li>
          <li><b>program:</b> Carrera — Ej: Ingeniería Civil</li>
          <li><b>mesaCode:</b> Número de mesa — Ej: 2</li>
          <li><b>enabled:</b> true (habilitado) / false (inhabilitado)</li>
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
  <HelpCircle className="w-4 h-4" />
  ¿Cómo llenar?
</button>

          </div>
          

          <div className="relative w-80">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, carnet o carrera..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 w-full rounded-full border border-gray-300 shadow focus:ring-2 focus:ring-[#8BF3FA] focus:border-[#8BF3FA] transition-all"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F0FA] text-[#4A306D] text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-2 text-left">Carnet</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Carrera</th>
                <th className="px-4 py-2 text-center">Mesa</th>
                <th className="px-4 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {currentVoters.length > 0 ? (
                currentVoters.map((v, i) => (
                  <tr
                    key={i}
                    className={`${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-[#F9F7FB] transition`}
                  >
                    <td className="px-4 py-2">{v.docId}</td>
                    <td className="px-4 py-2">{v.fullName}</td>
                    <td className="px-4 py-2">{v.program}</td>
                    <td className="px-4 py-2 text-center">{v.mesaCode}</td>
                    <td className="px-4 py-2 text-center">
                      {v.enabled ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                          Habilitado
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                          Inhabilitado
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400 italic">
                    No se encontraron resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="bg-[#E2D6F9] text-[#4A306D] px-4 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-[#D1B8F2] transition"
            >
              ← Anterior
            </button>
            <span className="text-gray-600 text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-[#E2D6F9] text-[#4A306D] px-4 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-[#D1B8F2] transition"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Totales (abajo derecha) */}
        <div className="mt-8 flex justify-end text-sm text-gray-700 gap-8">
          <p className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#9E62B2]" /> Total:{" "}
            <b>{stats.total}</b>
          </p>
          <p className="flex items-center gap-2 text-green-700">
            <UserCheck className="w-4 h-4" /> Habilitados: <b>{stats.enabled}</b>
          </p>
          <p className="flex items-center gap-2 text-red-700">
            <UserX className="w-4 h-4" /> Inhabilitados: <b>{stats.disabled}</b>
          </p>
        </div>

        {/* Botón registrar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={registerPadron}
            disabled={loading || voters.length === 0}
            className="flex items-center gap-2 bg-[#9E62B2] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#864fa0] transition disabled:opacity-50"
          >
            <FileUp className="w-4 h-4" />
            {loading ? "Registrando..." : "Registrar padrón"}
          </button>
        </div>
      </div>
      
    </AdminLayout>
  );
}
