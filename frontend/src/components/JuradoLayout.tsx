import { UserCircle } from "lucide-react";
import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function JuradoLayout({ children }: Props) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header superior */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#9E62B2]">
          VTU - Panel de Jurado
        </h1>
      <div className="p-4 border-t flex items-center gap-3 bg-[#F9F8FB]">
        <UserCircle className="w-8 h-8 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {user.username}
        </span>
      </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
