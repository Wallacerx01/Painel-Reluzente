import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import PrivateRoute from "./PrivateRoute";

import Login from "./pages/Login";
import AddProdutos from "./pages/AddProdutos";
import PainelPedidos from "./pages/PainelPedidos";
import MeuCardapio from "./pages/MeuCardapio";
import ForgotPassword from "./pages/ForgotPassword";
import NewPassword from "./pages/NewPassword";
import HorariosPainel from "./pages/HorariosPainel";
import HandleRecoveryLink from "./HandleRecoveryLink";

function RoutesApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* rotas públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/new-password" element={<NewPassword />} />
          <Route path="/recover" element={<HandleRecoveryLink />} />

          {/* rotas privadas */}
          <Route
            path="/painel-pedidos"
            element={
              <PrivateRoute>
                <PainelPedidos />
              </PrivateRoute>
            }
          />
          <Route
            path="/adicionar-produtos"
            element={
              <PrivateRoute>
                <AddProdutos />
              </PrivateRoute>
            }
          />
          <Route
            path="/meu-cardapio"
            element={
              <PrivateRoute>
                <MeuCardapio />
              </PrivateRoute>
            }
          />
          <Route
            path="/horarios"
            element={
              <PrivateRoute>
                <HorariosPainel />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<h2>Página não encontrada</h2>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default RoutesApp;
