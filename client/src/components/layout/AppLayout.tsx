import React from "react";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-[250px_1fr] min-h-screen bg-gray-50">
      <Sidebar />
      <main className="overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
