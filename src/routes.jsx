import { BrowserRouter, Routes, Route } from "react-router-dom";

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/painel-pedidos" element={<PainelPedidos />} />
        <Route path="/adicionar-produtos" element={<AddProdutos />} />
        <Route path="/meu-cardapio" element={<MeuCardapio />} />
        <Route path="/new-password" element={<NewPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/horarios" element={<HorariosPainel />} />
        <Route path="/recover" element={<HandleRecoveryLink />} />

        <Route path="*" element={<h2>Página não encontrada</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default RoutesApp;
