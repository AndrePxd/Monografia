import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../utils/authFetch";
import Swal from "sweetalert2";

interface Candidate {
  id: number;
  name: string;
  slogan: string;
  photoUrl: string;
  colorHex: string;
}

export default function VotacionPage() {
  const { tokenValue } = useParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch(`http://localhost:8081/api/vote/validate/${tokenValue}`);
        if (!res.ok) throw new Error("Token inválido o expirado");
        const data = await res.json();
        setCandidates(data.candidates);
      } catch (err: any) {
        Swal.fire("Error", err.message, "error");
        navigate("/cabina");
      }
    };
    fetchData();
  }, [tokenValue, navigate]);

  const submitVote = async () => {
   if (selected === null) {
        Swal.fire("Atención", "Debes seleccionar un candidato o voto en blanco.", "warning");
        return;
    }

    try {
      const res = await authFetch("http://localhost:8081/api/vote/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenValue, candidateId: selected }),
      });
      if (!res.ok) throw new Error("Error al registrar voto");
      Swal.fire({
        icon: "success",
        title: "Voto registrado",
        text: "Gracias por participar.",
      }).then(() => navigate("/cabina"));
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center">
      <h1 className="text-xl font-semibold text-[#9E62B2] mb-2 tracking-wide">
         BOLETA DE VOTACIÓN
      </h1>
      <p className="text-gray-700 font-medium mb-6">
        POR FAVOR MARQUE LA CASILLA
      </p>

<div className="grid grid-cols-3 gap-10">
  {candidates.map((c) => (
    <div key={c.id} className="flex flex-col items-center">
      <img
        src={c.photoUrl}
        alt={c.name}
        className="w-28 h-28 rounded-full object-cover border"
      />
      <h3 className="font-bold mt-2">{c.name}</h3>
      <p className="text-gray-500 text-sm">{c.slogan}</p>
      <div
        className={`w-8 h-8 mt-3 border-2 rounded cursor-pointer flex items-center justify-center ${
          selected === c.id ? "border-green-500 bg-green-100" : "border-gray-300"
        }`}
        onClick={() => setSelected(c.id)}
      >
        {selected === c.id && <span className="text-green-500 text-xl">✓</span>}
      </div>
    </div>
  ))}

  {/*  Opción de voto en blanco */}
  <div className="flex flex-col items-center">
    <div className="w-28 h-28 rounded-full border border-gray-300 flex items-center justify-center bg-gray-50">
      <span className="text-gray-400 text-xl font-semibold">BLANCO</span>
    </div>
    <h3 className="font-bold mt-2 text-gray-700">Voto en Blanco</h3>
    <p className="text-gray-500 text-sm">Sin preferencia</p>
    <div
      className={`w-8 h-8 mt-3 border-2 rounded cursor-pointer flex items-center justify-center ${
        selected === 0 ? "border-green-500 bg-green-100" : "border-gray-300"
      }`}
      onClick={() => setSelected(0)} // 0 = voto en blanco
    >
      {selected === 0 && <span className="text-green-500 text-xl">✓</span>}
    </div>
  </div>
</div>

<button
  onClick={submitVote}
  className="mt-10 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold"
>
  REGISTRAR VOTO
</button>

    </div>
  );
}
