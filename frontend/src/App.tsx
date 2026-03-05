import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VoterManagementPage from "./pages/VoterManagementPage"; 
import PrivateRoute from "./components/PrivateRoute";
import ElectionConfigPage from "./pages/ElectionConfigPage";
import JuradoElectionsPage from "./pages/JuradoElectionsPage";
import JuradoPadronPage from "./pages/JuradoPadronPage";
import AcreditacionQRPage from "./pages/AcreditacionQRPage";
import CabinaQRPage from "./pages/CabinaQRPage";
import VotacionPage from "./pages/VotacionPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import VerifyPage from "./pages/VerifyPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Solo ADMIN */}
        <Route
          path="/voters/upload"
          element={
            <PrivateRoute element={<VoterManagementPage />} roles={["ADMIN"]} />
          }
        />
        <Route
          path="/elections/config"
          element={
            <PrivateRoute element={<ElectionConfigPage />} roles={["ADMIN"]} />
          }
        />
                <Route
          path="/elections/reports"
          element={
            <PrivateRoute element={<AdminReportsPage />} roles={["ADMIN"]} />
          }
        />
         <Route
          path="/elections/jurado"
          element={
            <PrivateRoute element={<JuradoElectionsPage />} roles={["JURADO"]} />
          }
        />
        <Route
        path="/jurado/padron/:electionId"
        element={<PrivateRoute element={<JuradoPadronPage />} roles={["JURADO"]} />}
    />
            <Route
        path="/qr/:electionId/:docId"
        element={<PrivateRoute element={<AcreditacionQRPage />} roles={["JURADO"]} />}
    />

    <Route path="/qr/:electionId/token/:tokenValue" 
       element = {<PrivateRoute element={<AcreditacionQRPage /> } roles={["JURADO"]} />}
    />
    <Route
        path="/cabina"
        element={<PrivateRoute element={<CabinaQRPage />}/>}
    />
    <Route path="/votar/:tokenValue" element={<VotacionPage />} />

        <Route
        path="/verificar/acta/:tokenValue"
        element={<PrivateRoute element={<VerifyPage />}/>}
    />


      </Routes>
    </BrowserRouter>
  );
}
