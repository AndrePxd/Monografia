import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "qr-scanner";
import Swal from "sweetalert2";

export default function CabinaQRPage() {
  const [result, setResult] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const video = document.getElementById("qr-video") as HTMLVideoElement;

    const scanner = new QrScanner(
      video,
      (res) => {
        setResult(res.data);
        scanner.stop();
        Swal.fire({
          icon: "success",
          title: "QR detectado",
          text: "Redirigiendo a la boleta de votación...",
          timer: 1500,
          showConfirmButton: false,
        });
        setTimeout(() => navigate(`/votar/${encodeURIComponent(res.data)}`), 1500);
      },
      { highlightScanRegion: true, highlightCodeOutline: true }
    );

    scanner.start();
    return () => scanner.stop();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center">
      <h1 className="text-xl font-semibold text-[#9E62B2] mb-2 tracking-wide">
        LECTOR QR
      </h1>
      <p className="text-gray-700 font-medium mb-6">
        MUESTRE SU QR A LA CÁMARA
      </p>

      <div className="relative w-[320px] h-[320px] border-4 border-[#9E62B2] rounded-lg overflow-hidden shadow-lg">
        <video id="qr-video" className="w-full h-full object-cover" />
      </div>

      <p className="mt-6 text-xs text-gray-400">No registramos su identidad</p>
    </div>
  );
}
