import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function PainelHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editHorario, setEditHorario] = useState(null);

  const fetchHorarios = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatusMsg("Usuário não autenticado");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("usuario_horarios")
      .select("horarios(*)")
      .eq("usuario_id", user.id);

    if (error) {
      console.error(error);
      setStatusMsg("Erro ao carregar horários");
    } else {
      setHorarios(
        data.map(({ horarios: h }) => ({
          ...h,
          abertura: h.abertura || "",
          fechamento: h.fechamento || "",
        }))
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchHorarios();
  }, []);

  const handleChange = (campo, valor) => {
    setEditHorario((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSalvar = async () => {
    const { id, abertura, fechamento, fechado } = editHorario;

    const updateData = fechado
      ? { abertura: null, fechamento: null, ativo: false }
      : { abertura, fechamento, ativo: true };

    const { error } = await supabase
      .from("horarios")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      setStatusMsg(`✅ Horário de ${editHorario.dia_semana} salvo!`);
      setTimeout(() => setStatusMsg(""), 3000);
      setShowModal(false);
      fetchHorarios();
    } else {
      setStatusMsg("Erro ao salvar horário");
    }
  };

  return (
    <main className="bg-gray-100 w-screen min-h-screen flex flex-col">
      <Header />
      <h1 className="text-3xl font-bold text-center mt-6 text-gray-800">
        Painel de Horários
      </h1>
      {statusMsg && (
        <p className="text-center p-2 text-green-600 font-medium">
          {statusMsg}
        </p>
      )}

      <section className="flex-1 p-8 max-w-2xl mx-auto">
        {loading ? (
          <p className="text-center text-gray-500">Carregando horários...</p>
        ) : (
          <ul className="space-y-6">
            {horarios.map((h) => (
              <li
                key={h.id}
                className={`p-6 bg-white rounded-2xl shadow-md flex justify-between items-center transition transform hover:scale-[1.02] hover:shadow-xl`}
              >
                <div className="flex flex-col gap-2">
                  <p
                    className={`text-lg font-semibold ${
                      !h.ativo ? "text-gray-400 line-through" : "text-gray-800"
                    }`}
                  >
                    {h.dia_semana}
                  </p>
                  <p
                    className={`text-sm ${
                      !h.ativo ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {h.abertura && h.fechamento
                      ? `${h.abertura.slice(0, 5)} - ${h.fechamento.slice(
                          0,
                          5
                        )}`
                      : "Fechado"}
                  </p>
                </div>
                <button
                  className="bg-[#5A4739] text-white px-4 py-2 rounded-sm font-medium hover:bg-[#4a3a2e] transition ml-30"
                  onClick={() => {
                    setEditHorario({
                      ...h,
                      fechado: !h.ativo,
                    });
                    setShowModal(true);
                  }}
                >
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------- MODAL -------- */}
      {showModal && editHorario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 text-black shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold mb-5 text-center">
              Editar {editHorario.dia_semana}
            </h2>

            <label className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
              <input
                type="checkbox"
                checked={editHorario.fechado}
                onChange={(e) => handleChange("fechado", e.target.checked)}
              />
              Fechado
            </label>

            {!editHorario.fechado && (
              <div className="flex gap-4 mb-4">
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-semibold text-gray-600 mb-1">
                    Abertura
                  </label>
                  <input
                    type="time"
                    value={editHorario.abertura}
                    onChange={(e) => handleChange("abertura", e.target.value)}
                    className="rounded-lg p-2 border border-gray-300 shadow-sm"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-semibold text-gray-600 mb-1">
                    Fechamento
                  </label>
                  <input
                    type="time"
                    value={editHorario.fechamento}
                    onChange={(e) => handleChange("fechamento", e.target.value)}
                    className="rounded-lg p-2 border border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                className="bg-gray-300 px-4 py-2 rounded-full hover:bg-gray-400 transition"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="bg-[#5A4739] text-white px-6 py-2 rounded-full hover:bg-[#4a3a2e] transition"
                onClick={handleSalvar}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

export default PainelHorarios;
