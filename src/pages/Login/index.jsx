import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo-white.png";
import supabase from "../../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false); // ✅ Estado para mostrar/ocultar
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const criarHorariosPadraoSeNaoExistirem = async (userId) => {
    // Verifica se já existem horários vinculados a este usuário
    const { data: existentes, error: erroBusca } = await supabase
      .from("usuario_horarios")
      .select("id")
      .eq("usuario_id", userId);

    if (erroBusca) {
      console.error("Erro ao verificar horários existentes:", erroBusca);
      return;
    }

    if (existentes.length > 0) {
      // Se já existem, não faz nada
      return;
    }

    const dias = [
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
      "Domingo",
    ];

    for (const dia of dias) {
      const { data: horario, error: erroHorario } = await supabase
        .from("horarios")
        .insert([
          {
            dia_semana: dia,
            abertura: "10:00",
            fechamento: "14:30",
            ativo: true,
          },
        ])
        .select()
        .single();

      if (erroHorario) {
        console.error(`Erro ao criar horário para ${dia}:`, erroHorario);
        continue;
      }

      const { error: erroVinculo } = await supabase
        .from("usuario_horarios")
        .insert([
          {
            usuario_id: userId,
            horario_id: horario.id,
          },
        ]);

      if (erroVinculo) {
        console.error(
          `Erro ao vincular horário de ${dia} ao usuário:`,
          erroVinculo
        );
      }
    }
  };

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
        await criarHorariosPadraoSeNaoExistirem(data.user.id);
        navigate("/painel-pedidos");
      }
    } catch (err) {
      setErrorMsg("Erro inesperado. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToForgotPassword = () => {
    navigate("/forgot-password");
  };

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

          {/* Input de senha com "olho" */}
          <div className="relative w-full">
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Senha..."
              className="rounded-lg w-full p-2 bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-2 text-gray-500"
              onClick={() => setMostrarSenha(!mostrarSenha)}
            >
              {mostrarSenha ? "🙈" : "👁️"}
            </button>
          </div>

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

          <button
            type="button"
            className="cursor-pointer mt-2 text-gray-400 hover:text-gray-200
             hover:underline hover:scale-102 transition-all duration-200"
            onClick={handleGoToForgotPassword}
          >
            Esqueci minha senha
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
