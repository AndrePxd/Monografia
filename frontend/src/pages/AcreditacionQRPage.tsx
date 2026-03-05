import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../utils/authFetch";
import Swal from "sweetalert2";

interface QRResponse {
  token: string;
  qr: string;
  expiresAt: string;
}

export default function AcreditacionQRPage() {
  // 👉 el segundo param puede ser docId o token
  const { electionId, docId: code } = useParams();
  const [qrData, setQrData] = useState<QRResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 min
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQR = async () => {
      try {
        if (!code) throw new Error("Código no válido");

        // Heurística simple: si contiene '-', lo tratamos como token
        const looksLikeToken = code.includes("-");

        const url = looksLikeToken
          ? `http://localhost:8081/api/accreditation/by-token/${code}`
          : `http://localhost:8081/api/accreditation/${electionId}/voter/${code}`;

        const res = await authFetch(url, { method: "POST" });
        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || data.details || "Error al generar/obtener QR");
        }

        setQrData(data);
      } catch (err: any) {
        Swal.fire("Error", err.message || "Error al generar QR", "error").then(() => {
          navigate(-1);
        });
      }
    };

    fetchQR();
  }, [electionId, code, navigate]);

  // === Contador regresivo ===
  useEffect(() => {
    if (!qrData) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrData]);

  if (!qrData)
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F5FB] text-gray-500 text-lg">
        Generando QR...
      </div>
    );

  const formatTime = (t: number) =>
    `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFFFFF] text-center">
      <h1 className="text-xl font-semibold text-[#9E62B2] mb-2 tracking-wide">
        CREDENCIAL QR
      </h1>
      <p className="text-gray-700 font-medium">
        POR FAVOR FOTOGRAFÍE EL QR PARA MOSTRARLO EN CABINA
      </p>

      <p className="text-sm text-gray-500 mt-2">
        TIEMPO DE DURACIÓN: {formatTime(timeLeft)}
      </p>

      <div className="mt-6 bg-white p-6 shadow-md rounded-xl">
        <img
          src={qrData.qr}
          alt="QR"
          className="w-72 h-72 object-contain mx-auto"
        />
      </div>

      <button
        onClick={() => navigate(-1)}
        className="mt-6 bg-[#8BF3FA] text-black px-6 py-2 rounded hover:bg-[#6BD2E1] transition"
      >
        VOLVER AL PADRÓN
      </button>

      <p className="mt-6 text-xs text-gray-400">No registramos su identidad</p>
    </div>
  );
}
