import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react"; // ícones (já vem do lucide-react)
import logo from "../../assets/logo-white.png";

function Header() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="bg-[#5A4739] h-20 flex items-center justify-between px-4 md:px-10 relative">
      {/* Logo centralizada no mobile */}
      <div className="flex-1 flex justify-center md:justify-start">
        <Link to="/painel-pedidos">
          <img
            src={logo}
            alt="Logo reluzente"
            className="w-16 h-16 rounded-full shadow-lg hover:scale-110 duration-200 cursor-pointer"
          />
        </Link>
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
            <Link
              to="/adicionar-produtos"
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Adicionar produtos
            </Link>
          </li>
          <li>
            <Link
              to="/meu-cardapio"
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Meu cardápio
            </Link>
          </li>
          <li>
            <Link
              to="/painel-pedidos"
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Painel de pedidos
            </Link>
          </li>
          <li>
            <Link
              to="/horarios"
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Horarios
            </Link>
          </li>
          <li>
            <Link
              to="/"
              className="hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
            >
              Sair
            </Link>
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
                  <Link
                    to="/adicionar-produtos"
                    onClick={() => setMenuAberto(false)}
                  >
                    Adicionar produtos
                  </Link>
                </li>
                <li>
                  <Link to="/meu-cardapio" onClick={() => setMenuAberto(false)}>
                    Meu cardápio
                  </Link>
                </li>
                <li>
                  <Link
                    to="/painel-pedidos"
                    onClick={() => setMenuAberto(false)}
                  >
                    Painel de pedidos
                  </Link>
                </li>
                <li>
                  <Link to="/horarios" onClick={() => setMenuAberto(false)}>
                    Horarios
                  </Link>
                </li>
                <li>
                  <Link to="/" onClick={() => setMenuAberto(false)}>
                    Sair
                  </Link>
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
