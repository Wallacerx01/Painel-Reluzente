import { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabaseClient";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

function NewPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNewPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirm) {
      Toastify({
        text: "⚠️ As senhas não conferem!",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ef4444" },
      }).showToast();
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        Toastify({
          text: "Erro: " + error.message,
          duration: 3000,
          gravity: "top",
          position: "right",
          style: { background: "#ef4444" },
        }).showToast();
      } else {
        Toastify({
          text: "✅ Senha redefinida com sucesso! Redirecionando...",
          duration: 3000,
          gravity: "top",
          position: "right",
          style: { background: "#008000" },
        }).showToast();

        // 🔒 Dica de segurança: encerra sessão temporária
        await supabase.auth.signOut();

        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      console.error(err);
      Toastify({
        text: "Erro inesperado. Tente novamente.",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ef4444" },
      }).showToast();
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
      </section>
    </main>
  );
}

export default NewPassword;
