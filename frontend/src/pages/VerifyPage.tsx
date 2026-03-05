import React, { useEffect, useState } from "react";

interface VerifyResponse {
  provided: string;
  expected: string;
  valid: boolean;
}

const VerifyPage: React.FC = () => {
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const pathParts = window.location.pathname.split("/");
        const hash = pathParts[pathParts.length - 1];
        const params = new URLSearchParams(window.location.search);
        const electionId = params.get("electionId");

        const response = await fetch(
          `http://localhost:8081/api/results/verify/${hash}?electionId=${electionId}`
        );

        if (!response.ok) throw new Error("Error al verificar el acta");

        const json = await response.json();
        setData(json);
      } catch (err) {
        setError("No se pudo realizar la verificación.");
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Cargando verificación...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">❌ Error</h1>
        <p>{error || "Ocurrió un problema al verificar el acta."}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-2xl w-full bg-white shadow-md rounded-lg p-6">
        <h1 className="text-center text-2xl font-bold text-purple-700 mb-4">
          Verificación del Acta Digital
        </h1>

        <div className="text-center mb-4">
          {data.valid ? (
            <div className="text-green-600 text-lg font-semibold">
               El acta es auténtica y no ha sido modificada.
            </div>
          ) : (
            <div className="text-red-600 text-lg font-semibold">
               El acta no coincide con el registro original.
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-3 rounded-md mb-3">
          <strong>Hash esperado (original):</strong>
          <p className="font-mono text-sm break-all">{data.expected}</p>
        </div>

        <div className="bg-gray-100 p-3 rounded-md mb-3">
          <strong>Hash recibido (desde el PDF):</strong>
          <p className="font-mono text-sm break-all">{data.provided}</p>
        </div>

        <p className="text-gray-700 text-justify">
          {data.valid ? (
            <>
              Ambos hash coinciden, lo que significa que el documento verificado
              es <strong>auténtico</strong> y no ha sufrido alteraciones desde su
              generación. Puede confiar en su integridad.
            </>
          ) : (
            <>
              Los hash no coinciden. Esto indica que el documento puede haber sido
              modificado o no corresponde al registro oficial de esta elección.
              Le recomendamos validar la fuente del archivo.
            </>
          )}
        </p>

        <div className="text-center text-sm text-gray-500 mt-6 border-t pt-3">
          Generado por el Sistema VTU — Universidad Católica Boliviana
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
