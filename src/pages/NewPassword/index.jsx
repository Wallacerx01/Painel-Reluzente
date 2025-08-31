import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import supabase from "../../supabaseClient";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

function NewPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get("access_token"); // Token do link do email

  const handleNewPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (password !== confirm) {
      setMessage("⚠️ As senhas não conferem!");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser(
        { password },
        token ? { accessToken: token } : {}
      );

      if (error) {
        setMessage(
          Toastify({
            text: "Error: " + Error.message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#ef4444" },
          }).showToast()
        );
      } else {
        setMessage(
          Toastify({
            text: `✅ Senha redefinida com sucesso! Redirecionando...`,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#008000" },
          }).showToast()
        );

        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setMessage("Erro inesperado. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#B59275] w-screen h-screen flex flex-col justify-center items-center">
      <section className="flex flex-col gap-6 max-w-md w-full p-6 bg-[#5A4739] rounded-xl shadow-lg">
        <h2 className="text-white text-2xl font-bold text-center">
          Redefinir Senha
        </h2>
        <p className="text-gray-200 text-center">
          Digite a nova senha e confirme para atualizar sua conta.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleNewPassword}>
          <input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg w-full p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#B59275]"
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="rounded-lg w-full p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#B59275]"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#B59275] text-white rounded-lg w-full font-bold p-2 cursor-pointer
              hover:bg-[#5A4739] hover:scale-102 transition-all duration-200 shadow-md"
          >
            {loading ? "Atualizando..." : "Redefinir senha"}
          </button>
        </form>

        {message && (
          <p
            className={`text-center font-semibold ${
              message.includes("✅") ? "text-green-400" : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

export default NewPassword;
