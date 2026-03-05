import { useEffect, useState } from "react";
import { BarChart2, Download, FileText } from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { authFetch } from "../utils/authFetch";
import Swal from "sweetalert2";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}


interface Election {
  id: number;
  name: string;
  status: string;
}

interface Metrics {
  habilitados: number;
  acreditados: number;
  tokensEmitidos: number;
  tokensUsados: number;
  tokensCaducados: number;
  votosEmitidos?: number;
}

interface CandidateSummary {
  candidateId: number;
  candidate: string;
  votes: number;
}

interface TiempoMesa {
  mesa: string;        
  promedioMin: number;  
  minMin: number;       
  maxMin: number;       
}


export default function AdminReportsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [summary, setSummary] = useState<{ byCandidate: CandidateSummary[] } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"PENDING"|"OPEN"|"CLOSED"|"">("");
  const [tiempos, setTiempos] = useState<TiempoMesa[] | null>(null);

  const token = localStorage.getItem("token");

  // 🔹 Cargar elecciones
  useEffect(() => {
    (async () => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await authFetch(`http://localhost:8081/api/elections/admin/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const list: Election[] = await res.json();
        setElections(list);
      }
    })();
  }, []);

  // 🔹 Cargar métricas + resumen
  const loadElectionData = async (id: number) => {
    setSelectedId(id);
    const found = elections.find((e) => e.id === id);
    setSelectedName(found?.name || "");
    setSelectedStatus((found?.status as "PENDING"|"OPEN"|"CLOSED") || "");

    try {
      const [metricsRes, summaryRes, tiemposRes] = await Promise.all([
        authFetch(`http://localhost:8081/api/results/${id}/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        authFetch(`http://localhost:8081/api/results/${id}/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
         authFetch(`http://localhost:8081/api/results/${id}/tiempos`, 
            { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (tiemposRes.ok) setTiempos(await tiemposRes.json());
    } catch (err) {
      Swal.fire("Error", "No se pudieron cargar los datos de la elección.", "error");
    }
  };

  // 🔹 Exportar métricas a Excel (con hoja de candidatos y tiempos)
const downloadMetrics = async () => {
  if (!selectedId || !metrics) return;

  const fecha = new Date().toLocaleString("es-BO");

  const wb = new ExcelJS.Workbook();

  // === Hoja 1: MÉTRICAS ===
  const ws1 = wb.addWorksheet("Métricas");
  const dataMetrics: (string | number)[][] = [
    ["Elección", selectedName || `ID ${selectedId}`],
    ["Fecha de exportación", fecha],
    [],
    ["Métrica", "Valor"],
    ["Habilitados", metrics.habilitados ?? 0],
    ["Acreditados", metrics.acreditados ?? 0],
    ["Votos Emitidos", metrics.votosEmitidos ?? 0],
    ["QR Emitidos", metrics.tokensEmitidos ?? 0],
    ["QR Usados", metrics.tokensUsados ?? 0],
    ["QR Caducados", metrics.tokensCaducados ?? 0],
    [
      "Participación (%)",
      metrics.habilitados
        ? Number((((metrics.votosEmitidos ?? 0) / metrics.habilitados) * 100).toFixed(2))
        : 0,
    ],
  ];
  ws1.addRows(dataMetrics);

  // === Hoja 2: RESULTADOS POR CANDIDATO ===
  const ws2 = wb.addWorksheet("Resultados por candidato");
  const dataCandidates: (string | number)[][] = [["Candidato", "Votos", "Porcentaje (%)"]];
  if (summary?.byCandidate?.length) {
    const total = summary.byCandidate.reduce((a, b) => a + b.votes, 0);
    summary.byCandidate.forEach((c) => {
      const pct = total > 0 ? Number(((c.votes / total) * 100).toFixed(2)) : 0;
      dataCandidates.push([c.candidate, c.votes, pct]);
    });
    dataCandidates.push([]);
    dataCandidates.push(["Total votos", total, 100]);
  } else {
    dataCandidates.push(["Sin resultados disponibles", "", ""]);
  }
  ws2.addRows(dataCandidates);

  // === Hoja 3: TIEMPOS POR MESA ===
  const ws3 = wb.addWorksheet("Tiempos en mesa");
  const dataTiempos: (string | number)[][] = [["Mesa", "Promedio (min)", "Mínimo (min)", "Máximo (min)"]];
  if (tiempos?.length) {
    tiempos.forEach((t) => {
      dataTiempos.push([
        t.mesa,
        Number(t.promedioMin?.toFixed?.(2) ?? t.promedioMin),
        Number(t.minMin?.toFixed?.(2) ?? t.minMin),
        Number(t.maxMin?.toFixed?.(2) ?? t.maxMin),
      ]);
    });
    const promedioGlobal =
      tiempos.reduce((acc, t) => acc + (t.promedioMin ?? 0), 0) / tiempos.length;
    dataTiempos.push([]);
    dataTiempos.push(["Promedio global", Number(promedioGlobal.toFixed(2)), "", ""]);
  } else {
    dataTiempos.push(["Sin datos de tiempos", "", "", ""]);
  }
  ws3.addRows(dataTiempos);

  // === 🎨 Estilos globales ===
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF9E62B2" }, // Morado
  };

  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
    name: "Calibri",
  };

  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEDE7F6" }, // Fondo lavanda suave
  };

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFCCCCCC" } },
    left: { style: "thin", color: { argb: "FFCCCCCC" } },
    bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    right: { style: "thin", color: { argb: "FFCCCCCC" } },
  };

  const centerAlign: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: "center",
  };

  const altFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF7F3FA" }, // Alternancia de filas
  };

  // === Función para aplicar estilos a una hoja ===
  const styleSheet = (ws: ExcelJS.Worksheet, headerRow: number = 4) => {
    ws.columns.forEach((col) => {
      col.width = 20;
    });

    // Detectar fila de encabezado (la primera con datos tabulares)
    const firstDataRow = ws.getRow(headerRow);
    if (firstDataRow.cellCount > 1) {
      firstDataRow.eachCell((cell) => {
        (cell as any).fill = headerFill;
        cell.font = headerFont;
        cell.border = borderStyle;
        cell.alignment = centerAlign;
      });
    }

    // Estilo general
    ws.eachRow((row, rowNumber) => {
      row.height = 20;
      row.eachCell((cell) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Alternancia de color (solo si no es encabezado)
      if (rowNumber > headerRow && rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          (cell as any).fill = altFill;
        });
      }

      // Fila de totales o promedios
      const firstCellValue = row.getCell(1).value?.toString().toLowerCase();
      if (firstCellValue?.includes("total") || firstCellValue?.includes("promedio")) {
        row.eachCell((cell) => {
          (cell as any).fill = totalFill;
          cell.font = { bold: true, color: { argb: "FF5E35B1" } };
        });
      }
    });
  };

  // === Aplicar estilos a las tres hojas ===
  [ws1, ws2, ws3].forEach((ws) => styleSheet(ws));

  // === Guardar archivo ===
  const buffer = await wb.xlsx.writeBuffer();
  const safeName = (selectedName || `Eleccion_${selectedId}`)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");

  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Reporte_Eleccion_${safeName}.xlsx`
  );
};





// === Generar Acta DETALLADA (PDF) ===
const generateActaDetallada = async (): Promise<void> => {
  if (!selectedId) return;

  try {
    const res = await fetch(`http://localhost:8081/api/results/${selectedId}/acta-detallada`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      Swal.fire("Error", "No se pudo generar el acta.", "error");
      return;
    }

    const payload = await res.json();
    const acta = payload.acta || {};
    const mesas: any[] = (acta.mesas || []).sort(
      (a: any, b: any) =>
        parseInt(String(a.codigo).replace(/\D/g, "")) -
        parseInt(String(b.codigo).replace(/\D/g, ""))
    );
    const totales = acta.totales || {};
    const eleccion = acta.eleccion || {};
    const hash: string = payload.sha256 || "No disponible";

    const verifyUrl: string = `http://localhost:5173/verificar/acta/${hash}?electionId=${selectedId}`;

    const fecha = new Date().toLocaleString("es-BO");

    const doc = new jsPDF("p", "mm", "a4");

    // ====== Encabezado ======
    const drawHeader = (title: string = "ACTA DETALLADA DE ELECCIÓN"): void => {
      doc.setFillColor(158, 98, 178);
      doc.rect(0, 0, 210, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Sistema VTU", 105, 11, {
        align: "center",
      });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text(title, 105, 33, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Elección: ${eleccion.nombre ?? selectedName}`, 20, 47);
      doc.text(
  `Estado: ${({ OPEN: "ABIERTA", PENDING: "PENDIENTE", CLOSED: "FINALIZADA" } as any)[(eleccion.estado || "").toUpperCase()] ?? "FINALIZADA"}`,
  20,
  54
);
      doc.text(`Fecha de emisión: ${fecha}`, 20, 61);
      doc.setDrawColor(158, 98, 178);
      doc.line(20, 67, 190, 67);
    };

    drawHeader();
    let y = 75;

    // ====== Control de salto de página ======
    const ensureSpace = (needed: number = 40, headerTitle?: string): void => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + needed > pageHeight - 30) {
        doc.addPage();
        drawHeader(headerTitle ?? "ACTA DETALLADA DE ELECCIÓN");
        y = 75;
      }
    };

    // ====== Detalle por mesa ======
    for (const m of mesas) {
      const codigo = m.codigo ?? "—";
      const jurado = m.jurado ?? "—";
      const habilitados = m.habilitados ?? 0;
      const acreditados = m.acreditados ?? 0;
      const noAcreditados = m.noAcreditados ?? 0;
      const votos = m.votosTotalesMesa ?? 0;
      const blancos = m.votosBlancos ?? 0;
      const porCandidato: { candidato: string; votos: number }[] =
        m.porCandidato || [];

      ensureSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Mesa ${String(codigo).replace(/\D/g, "")} — Jurado: ${jurado}`, 20, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Habilitados: ${habilitados}`, 20, y);
      doc.text(`Acreditados: ${acreditados}`, 80, y);
      doc.text(`No acreditados: ${noAcreditados}`, 140, y);
      y += 6;
      doc.text(`Votos en blanco: ${blancos}`, 20, y);
      doc.text(`Votos totales: ${votos}`, 80, y);
      y += 8;

      if (porCandidato.length > 0) {
        const totalMesa = porCandidato.reduce(
          (a, b) => a + (Number(b.votos) || 0),
          0
        );
        const rows = porCandidato.map((c) => [
          String(c.candidato ?? "—"),
          String(c.votos ?? 0),
          totalMesa > 0
            ? `${(((Number(c.votos) || 0) / totalMesa) * 100).toFixed(1)}%`
            : "0%",
        ]);

        autoTable(doc, {
          startY: y + 2,
          head: [["Candidato", "Votos", "%"]],
          body: rows,
          theme: "grid",
          margin: { left: 20, right: 20 },
          styles: { font: "helvetica", fontSize: 10, halign: "center" },
          headStyles: {
            fillColor: [158, 98, 178],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [245, 240, 250] },
        });
        // @ts-ignore
        y = (doc as any).lastAutoTable.finalY + 8;
      } else {
        doc.setFont("helvetica", "italic");
        doc.text("Sin votos registrados para esta mesa.", 20, y);
        y += 10;
      }

      doc.setDrawColor(230);
      doc.line(20, y, 190, y);
      y += 6;
    }

    // ====== Resumen general ======
    ensureSpace(50, "RESUMEN GENERAL");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Resumen general de la elección", 20, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.text(`Habilitados: ${totales.habilitados}`, 20, y);
    y += 6;
    doc.text(`Acreditados: ${totales.acreditados}`, 20, y);
    y += 6;
    doc.text(`Votos totales: ${totales.votos}`, 20, y);
    y += 6;
    doc.text(`Participación: ${(totales.participacion || 0).toFixed(1)}%`, 20, y);
    y += 14;

    // ====== Bloque final (hash, verificación, QR y firma) ======
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginBottom = 25;
    const qrSize = 38;
    const espacioFirma = 14;
    const espacioBloqueFinal = qrSize + 80;

    // Si no cabe el bloque completo, pasa de página
    if (pageHeight - y < espacioBloqueFinal) {
      doc.addPage();
      drawHeader("ACTA DETALLADA DE ELECCIÓN");
      y = 75;
    }

    // --- Hash ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Hash SHA-256:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(hash, 20, y + 7, { maxWidth: 170 });
    y += 17;

    // --- Verificación ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Verificación:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(verifyUrl, 20, y + 7, { maxWidth: 170 });
    y += 25;

    // --- Separador visual y texto final ---
    doc.setDrawColor(220);
    doc.line(20, y, 190, y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(158, 98, 178);
    doc.text("Fin del Acta Detallada", 105, y, { align: "center" });
    y += 5;
    doc.setDrawColor(158, 98, 178);
    doc.line(75, y, 135, y);
    y += 15;

    // ====== Firma y QR ======
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      verifyUrl
    )}&size=${qrSize * 4}x${qrSize * 4}`;

    const qrBlob = await fetch(qrUrl).then((r) => r.blob());
    const reader = new FileReader();

    reader.onload = (): void => {
      const imgData = reader.result as string | null;
      if (imgData) {
        const qrX = 150;
        const qrY = pageHeight - qrSize - marginBottom;
        doc.addImage(imgData, "PNG", qrX, qrY, qrSize, qrSize);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(
          "Escanee para verificar autenticidad",
          qrX + qrSize / 2,
          qrY + qrSize + 5,
          { align: "center" }
        );
      }

      // Firma centrada
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const firmaY = pageHeight - marginBottom + espacioFirma;
      doc.text(
        "Generado digitalmente por: Sistema VTU",
        105,
        firmaY,
        { align: "center" }
      );

      const safeName = (eleccion.nombre ?? "Eleccion").replace(/[^\w\s-]/g, "_");
      doc.save(`ActaDetallada_${safeName}.pdf`);
    };

    reader.readAsDataURL(qrBlob);
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Ocurrió un problema al generar el acta.", "error");
  }
};

  // 🔹 Datos para gráficas
  const qrData = [
    { name: "Emitidos", value: metrics?.tokensEmitidos ?? 0 },
    { name: "Usados", value: metrics?.tokensUsados ?? 0 },
    { name: "Caducados", value: metrics?.tokensCaducados ?? 0 },
  ];

  const electoresData = [
    { name: "Acreditados", value: metrics?.acreditados ?? 0 },
    {
      name: "No acreditados",
      value: (metrics?.habilitados ?? 0) - (metrics?.acreditados ?? 0),
    },
  ];

  // Datos para el gráfico de tiempos por mesa (minutos)
const tiemposData = (tiempos ?? []).map(t => ({
  mesa: `Mesa ${t.mesa}`,
  "Mínimo": Number(t.minMin?.toFixed?.(1) ?? t.minMin),
  "Promedio": Number(t.promedioMin?.toFixed?.(1) ?? t.promedioMin),
  "Máximo": Number(t.maxMin?.toFixed?.(1) ?? t.maxMin),
}));


  const COLORS = ["#00ACC1", "#42d2bdff", "#FF92AE", "#4CAF50", "#FFB300"];

  const participacion =
    metrics && metrics.habilitados
      ? ((metrics.votosEmitidos ?? 0) / metrics.habilitados) * 100
      : 0;

  return (
    <AdminLayout>
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-[#4A306D]">
          <BarChart2 className="w-7 h-7 text-[#9E62B2]" /> Reportes de Elección
        </h1>

        {/* === Selector de elección === */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Seleccione una elección:
          </label>
          <div className="relative inline-block w-72">
            <select
              value={selectedId ?? ""}
              onChange={(e) => loadElectionData(Number(e.target.value))}
              className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-10 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-[#9E62B2] focus:border-[#9E62B2] shadow-sm"
            >
              <option value="">Seleccione una elección...</option>
              {elections.map((e) => {
                const estadoTraducido =
                  e.status === "OPEN"
                    ? "ABIERTA"
                    : e.status === "CLOSED"
                    ? "FINALIZADA"
                    : e.status === "PENDING"
                    ? "PENDIENTE"
                    : e.status;
                return (
                  <option key={e.id} value={e.id}>
                    {e.name} ({estadoTraducido})
                  </option>
                );
              })}
            </select>

            {/* Icono de flecha decorativo */}
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* === Tarjetas principales === */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 p-6 rounded-lg text-center border">
                <h2 className="text-gray-600 text-sm">Total de electores habilitados</h2>
                <p className="text-4xl font-bold text-black mt-2">{metrics.habilitados ?? 0}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg text-center border">
                <h2 className="text-gray-600 text-sm">Electores acreditados</h2>
                <p className="text-4xl font-bold text-black mt-2">{metrics.acreditados ?? 0}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg text-center border">
                <h2 className="text-gray-600 text-sm">Electores no acreditados</h2>
                <p className="text-4xl font-bold text-black mt-2">
                  {(metrics.habilitados ?? 0) - (metrics.acreditados ?? 0)}
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg text-center border">
                <h2 className="text-gray-600 text-sm">Participación</h2>
                <p className="text-4xl font-bold text-[#9E62B2] mt-2">
                  {participacion.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* === Gráficos QR / Electores === */}
            <h2 className="text-xl font-semibold text-[#4A306D] mb-4 mt-6">Resumen</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de barras (QR) */}
              <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">QR</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={qrData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[5, 5, 5, 5]}>
                      {qrData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico circular (Electores) */}
              <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Electores</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={electoresData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {electoresData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#4CAF50" : "#FFB300"} />
                      ))}
                      
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
{/* === Tiempos desde acreditación a voto por mesa === */}
{tiempos && tiempos.length > 0 && (
  <div className="mt-6 bg-white p-6 rounded-2xl shadow-md border border-gray-100">
    <h3 className="text-xl font-bold text-[#4A306D] mb-4 flex items-center gap-2">
      ⏱️ Tiempo desde acreditación a voto por mesa (min)
    </h3>

    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={tiemposData}
        barGap={6}
        barCategoryGap="20%"
        margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="mesa"
          tick={{ fill: "#4A306D", fontSize: 12, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#4A306D", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
          }}
          labelStyle={{ fontWeight: "bold", color: "#4A306D" }}
          formatter={(v: any) => `${Number(v).toFixed(1)} min`}
        />
        <Legend
          verticalAlign="top"
          align="center"
          wrapperStyle={{ paddingBottom: "10px", color: "#4A306D" }}
        />
        <Bar dataKey="Mínimo" fill="#42D2BD" radius={[6, 6, 0, 0]} name="Mínimo" />
        <Bar dataKey="Promedio" fill="#9E62B2" radius={[6, 6, 0, 0]} name="Promedio" />
        <Bar dataKey="Máximo" fill="#FF92AE" radius={[6, 6, 0, 0]} name="Máximo" />
      </BarChart>
    </ResponsiveContainer>

    {/* Promedio general */}
    {(() => {
      const totalPromedios = tiempos.reduce((sum, t) => sum + (t.promedioMin ?? 0), 0);
      const promedioGlobal = totalPromedios / tiempos.length;
      return (
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="bg-[#F3F0FA] border border-[#E3DAF5] rounded-xl px-5 py-3 shadow-sm">
            <p className="text-sm text-[#4A306D] font-semibold">
              Promedio global de tiempo entre acreditación y voto:
            </p>
            <p className="text-2xl font-bold text-[#9E62B2] mt-1">
              {promedioGlobal.toFixed(1)} min
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-3 italic">
            *Valores en minutos. “Promedio” representa el tiempo medio entre la acreditación (emisión del QR) y el voto (uso del QR).
          </p>
        </div>
      );
    })()}
  </div>
)}




            {/* === Tabla de candidatos === */}
            {summary?.byCandidate && summary.byCandidate.length > 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-[#4A306D] mb-4">
                  Resultados por candidato
                </h3>
                <table className="w-full border rounded-lg overflow-hidden">
                  <thead className="bg-[#F3F0FA] text-[#4A306D] text-sm">
                    <tr>
                      <th className="px-4 py-2 text-left">Candidato</th>
                      <th className="px-4 py-2 text-right">Votos</th>
                      <th className="px-4 py-2 text-left w-1/2">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byCandidate.map((c, idx) => {
                      const total = summary.byCandidate.reduce((a, b) => a + b.votes, 0);
                      const pct = total > 0 ? (c.votes / total) * 100 : 0;
                      return (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">{c.candidate}</td>
                          <td className="px-4 py-2 text-right font-semibold">{c.votes}</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="h-3 rounded-full bg-[#9E62B2]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* === Botones === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
              <button
                onClick={downloadMetrics}
                disabled={!metrics}
                className="flex items-center justify-center gap-2 bg-[#FFF4C1] hover:bg-[#FFE999] text-black font-semibold px-6 py-5 rounded-lg transition"
              >
                <Download className="w-5 h-5" /> EXPORTAR MÉTRICAS
              </button>
                <button
                    onClick={generateActaDetallada}
                    disabled={!selectedId}
                    className="flex items-center justify-center gap-2 bg-[#E8E1F7] hover:bg-[#D9C7F5] text-black font-semibold px-6 py-5 rounded-lg transition"
                    >
                    <FileText className="w-5 h-5" /> ACTA DETALLADA
                </button>
{/*
                <button
                    onClick={generateActaDetallada}
                    disabled={!selectedId || selectedStatus !== "CLOSED"}
                    className={`flex items-center justify-center gap-2 px-6 py-5 rounded-lg font-semibold transition ${
                      selectedStatus === "CLOSED"
                        ? "bg-[#E8E1F7] hover:bg-[#D9C7F5] text-black"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <FileText className="w-5 h-5" /> ACTA DETALLADA
                </button>
      */}



            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
