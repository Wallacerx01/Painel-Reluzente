import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import supabase from "../../supabaseClient";
import logo from "../../assets/logo-white.png";

function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/"); // redireciona para login
  };

  return (
    <header className="bg-[#5A4739] h-20 flex items-center justify-between px-4 md:px-10 relative">
      {/* Logo centralizada no mobile */}
      <div className="flex-1 flex justify-center md:justify-start">
        <img
          src={logo}
          alt="Logo reluzente"
          className="w-16 h-16 rounded-full shadow-lg hover:scale-110 duration-200 cursor-pointer"
          onClick={() => navigate("/painel-pedidos")}
        />
      </div>

      {/* Botão hamburguer só no mobile */}
      <button
        onClick={() => setMenuAberto(true)}
        className="md:hidden absolute right-4 text-white"
      >
        <Menu size={28} />
      </button>

      {/* Menu normal no desktop */}
      <nav className="hidden md:block">
        <ul className="list-none flex gap-6 text-white">
          <li>
            <button
              onClick={() => navigate("/adicionar-produtos")}
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Adicionar produtos
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/meu-cardapio")}
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Meu cardápio
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/painel-pedidos")}
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Painel de pedidos
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/horarios")}
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Horarios
            </button>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Sair
            </button>
          </li>
        </ul>
      </nav>

      {/* Drawer no mobile */}
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuAberto(false)}
        >
          <div
            className="absolute top-0 right-0 w-64 h-full bg-[#5A4739] shadow-lg p-5 flex flex-col gap-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão fechar */}
            <button
              onClick={() => setMenuAberto(false)}
              className="self-end text-white"
            >
              <X size={28} />
            </button>

            {/* Links do drawer */}
            <nav>
              <ul className="flex flex-col gap-4 text-lg">
                <li>
                  <button
                    onClick={() => {
                      navigate("/adicionar-produtos");
                      setMenuAberto(false);
                    }}
                  >
                    Adicionar produtos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      navigate("/meu-cardapio");
                      setMenuAberto(false);
                    }}
                  >
                    Meu cardápio
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      navigate("/painel-pedidos");
                      setMenuAberto(false);
                    }}
                  >
                    Painel de pedidos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      navigate("/horarios");
                      setMenuAberto(false);
                    }}
                  >
                    Horarios
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMenuAberto(false);
                    }}
                  >
                    Sair
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
