import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

function MeuCardapio() {
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", description: "" });

  const [confirmDelete, setConfirmDelete] = useState(null); // item a excluir

  useEffect(() => {
    buscarCardapio();
  }, []);

  // --------- BUSCAR DADOS ---------
  const buscarCardapio = async () => {
    setLoading(true);

    const { data: pratos, error: errorPratos } = await supabase
      .from("pratos")
      .select("*");

    const { data: bebidas, error: errorBebidas } = await supabase
      .from("bebidas")
      .select("*");

    if (errorPratos || errorBebidas) {
      console.log("Erro ao buscar cardápio:", errorPratos || errorBebidas);
    } else {
      setCardapio([
        ...pratos.map((p) => ({ ...p, tipo: "pratos" })),
        ...bebidas.map((b) => ({ ...b, tipo: "bebidas" })),
      ]);
    }

    setLoading(false);
  };

  // --------- EXCLUIR ---------
  const excluirItem = async () => {
    if (!confirmDelete) return;

    const { error } = await supabase
      .from(confirmDelete.tipo)
      .delete()
      .eq("id", confirmDelete.id);

    if (!error) {
      setCardapio(cardapio.filter((item) => item.id !== confirmDelete.id));
      setConfirmDelete(null); // fecha modal
    } else {
      console.log("Erro ao excluir:", error.message);
    }
  };

  // --------- ABRIR MODAL EDITAR ---------
  const abrirModal = (item) => {
    setEditItem(item);
    setForm({
      name: item.name,
      price: item.price,
      description: item.description,
    });
    setShowModal(true);
  };

  // --------- SALVAR EDIÇÃO ---------
  const salvarEdicao = async () => {
    const { error } = await supabase
      .from(editItem.tipo)
      .update({
        name: form.name,
        price: parseFloat(form.price),
        description: form.description,
      })
      .eq("id", editItem.id);

    if (!error) {
      setShowModal(false);
      setEditItem(null);
      buscarCardapio();
    } else {
      console.log("Erro ao salvar edição:", error.message);
    }
  };

  // --------- LOADING ---------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#B59275] text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
          <p className="mt-4 text-xl">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#B59275] min-h-screen text-white">
      <Header />
      <h1 className="text-3xl font-bold text-center mt-5">Meu cardápio</h1>

      <ul>
        {cardapio.map((e) => (
          <div
            key={e.id}
            className="flex gap-3 p-7 border-b border-white border-opacity-30"
          >
            <img
              src={e.img}
              alt={e.name}
              style={{ width: "130px", height: "auto" }}
              className="rounded-lg shadow-md"
            />

            <div className="flex flex-col items-start justify-center">
              <p className="font-bold text-lg">{e.name}</p>
              <p className="text-sm opacity-90">{e.description}</p>
              <p className="mt-1">{`R$ ${e.price.toFixed(2)}`}</p>

              <div className="flex gap-3">
                <button
                  className="bg-[#5A4739] rounded-sm px-4 py-1 mt-4 hover:bg-[#4a3a2e] transition"
                  onClick={() => abrirModal(e)}
                >
                  Editar
                </button>
                <button
                  className="bg-red-600 rounded-sm px-4 py-1 mt-4 hover:bg-red-700 transition"
                  onClick={() => setConfirmDelete(e)} // abre modal de confirmação
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </ul>

      {/* --------- MODAL EDITAR --------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-xl p-6 w-96 text-black shadow-xl">
            <h2 className="text-xl font-bold mb-4">Editar Item</h2>

            <label className="block mb-2">
              Nome:
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </label>

            <label className="block mb-2">
              Preço:
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </label>

            <label className="block mb-4">
              Descrição:
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-400 px-4 py-2 rounded hover:bg-gray-500"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="bg-[#5A4739] text-white px-4 py-2 rounded hover:bg-[#4a3a2e]"
                onClick={salvarEdicao}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------- MODAL CONFIRMAÇÃO EXCLUSÃO --------- */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-xl p-6 w-96 text-black shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-center">
              Confirmar Exclusão
            </h2>
            <p className="mb-6 text-center">
              Tem certeza que deseja excluir{" "}
              <span className="font-bold">{confirmDelete.name}</span>?
            </p>

            <div className="flex justify-center gap-4">
              <button
                className="bg-gray-400 px-4 py-2 rounded hover:bg-gray-500"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                onClick={excluirItem}
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default MeuCardapio;
