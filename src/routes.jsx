import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AddProdutos from "./pages/AddProdutos";
import PainelPedidos from "./pages/PainelPedidos";
import MeuCardapio from "./pages/MeuCardapio";
import ForgotPassword from "./pages/ForgotPassword";
import NewPassword from "./pages/NewPassword";

function RoutesApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/<Painel-Reluzente>" element={<Login />} />
        <Route path="/painelpedidos" element={<PainelPedidos />} />
        <Route path="/addprodutos" element={<AddProdutos />} />
        <Route path="/meucardapio" element={<MeuCardapio />} />
        <Route path="/newpassword" element={<NewPassword />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />

        <Route path="*" element={<h2>Página não encontrada</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default RoutesApp;
