import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo-white.png";
import supabase from "../../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        navigate("/painelpedidos");
      }
    } catch (err) {
      setErrorMsg("Erro inesperado. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- RESET SENHA ---
  // const handleResetPassword = async () => {
  //   if (!email) {
  //     alert("Digite seu email para recuperar a senha.");
  //     return;
  //   }

  //   try {
  //     const { error } = await supabase.auth.resetPasswordForEmail(email, {
  //       redirectTo: `${window.location.origin}/nova-senha`,
  //     });

  //     if (error) {
  //       alert("Erro ao enviar email: " + error.message);
  //     } else {
  //       alert("Email de recuperação enviado! Verifique sua caixa de entrada.");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     alert("Erro inesperado. Tente novamente.");
  //   }
  // };

  return (
    <main className="bg-[#B59275] w-screen h-screen flex flex-col justify-center items-center">
      <section className="flex flex-col gap-7 max-w-md w-full p-6 bg-[#5A4739] rounded-xl shadow-lg">
        <div className="flex justify-center">
          <img
            src={logo}
            alt="Logo reluzente"
            className="w-36 h-36 rounded-full shadow-lg hover:scale-110 duration-200"
          />
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email..."
            className="rounded-lg w-full p-2 bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha..."
            className="rounded-lg w-full p-2 bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && (
            <p className="text-red-500 font-semibold text-center">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-green-500 font-semibold text-center">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            className="bg-[#B59275] text-white rounded-lg w-full font-bold p-2 cursor-pointer
             hover:bg-gray-200 hover:text-gray-800 hover:scale-102 transition-all duration-200 shadow-md mt-2"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {/* <button
            type="button"
            className="cursor-pointer mt-2 text-gray-400 hover:text-gray-200
             hover:underline hover:scale-102 transition-all duration-200"
            onClick={handleResetPassword}
          >
            Esqueci minha senha
          </button> */}
        </form>
      </section>
    </main>
  );
}

export default Login;
