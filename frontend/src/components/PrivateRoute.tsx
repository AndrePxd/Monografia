import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";

interface PrivateRouteProps {
  element: ReactElement; // Ej: <DashboardPage />
  roles?: string[]; // Ej: ["ADMIN"] o ["ADMIN", "JURADO"]
}

export default function PrivateRoute({ element, roles }: PrivateRouteProps) {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null;

  // 🔹 No autenticado
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  // 🔹 No autorizado (rol no permitido)
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return element;
}
