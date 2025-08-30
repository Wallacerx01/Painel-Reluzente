import logo from "../../assets/logo-white.png";
import { Link } from "react-router-dom";

function Header() {
  return (
    <div>
      <header className="bg-[#5A4739] h-35 flex justify-around items-center">
        <div>
          <Link to="/painelpedidos">
            <img
              src={logo}
              alt="Logo reluzente"
              className="w-25 h-25 rounded-full shadow-lg hover:scale-110 duration-200 cursor-pointer"
            />
          </Link>
        </div>
        <div className="text-white ">
          <ul className="list-none flex gap-5">
            <li>
              <Link
                to="/addprodutos"
                className="text-white hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
              >
                Adicionar produtos
              </Link>
            </li>
            <li>
              <Link
                to="/meucardapio"
                className="text-white hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
              >
                Meu cardápio
              </Link>
            </li>
            <li>
              <Link
                to="/painelpedidos"
                className="text-white hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
              >
                Painel de pedidos
              </Link>
            </li>
            <li>
              <Link
                to="/"
                className="text-white hover:text-black hover:scale-110 hover:underline hover:shadow-lg transition-all duration-300"
              >
                Sair
              </Link>
            </li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default Header;
