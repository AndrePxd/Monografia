import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#9E62B2] -skew-y-6 transform origin-top-left"></div>
      <div className="relative bg-white shadow-lg rounded-lg p-10 w-[400px] z-10">
        {children}
      </div>
    </div>
  );
}
