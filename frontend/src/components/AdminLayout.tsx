import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
  <AdminSidebar />
  <main className="ml-64 flex-1 p-8 bg-gray-50 min-h-screen overflow-y-auto">
    {children}
  </main>
</div>
  );
}
