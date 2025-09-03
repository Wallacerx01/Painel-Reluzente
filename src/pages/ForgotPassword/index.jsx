import supabase from "../../supabaseClient";
import { useState } from "react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://painel-reluzente.vercel.app/new-password",
    });

    if (error) setMessage(error.message);
    else setMessage("✅ Verifique seu email para redefinir a senha!");

    setLoading(false);
  };

  return (
    <main className="bg-[#B59275] w-screen h-screen flex flex-col justify-center items-center">
      <section className="flex flex-col gap-6 max-w-md w-full p-6 bg-[#5A4739] rounded-xl shadow-lg">
        <h2 className="text-white text-2xl font-bold text-center">
          Esqueci minha senha
        </h2>
        <p className="text-gray-200 text-center">
          Digite seu email para receber um link de redefinição de senha.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleReset}>
          <input
            type="email"
            placeholder="Digite seu email"
            className="rounded-lg w-full p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#B59275]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#B59275] text-white rounded-lg w-full font-bold p-2 cursor-pointer
              hover:bg-[#5A4739] hover:scale-102 transition-all duration-200 shadow-md"
          >
            {loading ? "Enviando..." : "Enviar link"}
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

export default ForgotPassword;
