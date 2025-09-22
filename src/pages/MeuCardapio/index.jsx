import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// --- TOAST HELPER ---
const showToast = (text, color = "#008000") => {
  Toastify({
    text,
    duration: 3000,
    gravity: "top",
    position: "right",
    style: { background: color },
  }).showToast();
};

function MeuCardapio() {
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    dias: [],
    ingredientes: [],
    tamanhos: [],
    categoria: "Sem categoria",
  });
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ---------- DIAS ----------
  const diaMap = {
    Domingo: 0,
    Segunda: 1,
    Terça: 2,
    Quarta: 3,
    Quinta: 4,
    Sexta: 5,
    Sábado: 6,
  };
  const diasNomes = Object.keys(diaMap);

  const handleDiaChange = (dia) => {
    setForm((prev) => ({
      ...prev,
      dias: prev.dias.includes(dia)
        ? prev.dias.filter((d) => d !== dia)
        : [...prev.dias, dia],
    }));
  };

  // ---------- BUSCAR CARDÁPIO ----------
  const buscarCardapio = async () => {
    setLoading(true);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("usuario_produtos")
      .select(
        `
        id,
        produto_id (
          id,
          name,
          description,
          price,
          img,
          dias,
          created_at,
          ordem,
          categoria_id,
          categorias (
            id,
            name
          ),
          produto_ingredientes (
            id,
            ingrediente_id,
            obrigatorio,
            extra,
            preco_adicional,
            ingredientes (
              id,
              name,
              img
            )
          ),
          produto_tamanhos (
            id,
            tamanho,
            preco
          )
        )
      `
      )
      .eq("usuario_id", user.id);

    if (error) {
      showToast("Erro ao carregar produtos!", "#ef4444");
      setLoading(false);
      return;
    }

    const sortedData =
      (data || [])
        .map((item) => {
          const prod = item.produto_id;
          if (!prod) return null;

          const ingredientes = (prod.produto_ingredientes || []).map((pi) => ({
            id: pi.ingrediente_id,
            name: pi.ingredientes?.name,
            img: pi.ingredientes?.img,
            obrigatorio: pi.obrigatorio,
            extra: pi.extra,
            preco_adicional: pi.preco_adicional,
            pi_id: pi.id,
          }));

          const tamanhos = (prod.produto_tamanhos || []).map((t) => ({
            id: t.id,
            tamanho: t.tamanho,
            preco: t.preco,
          }));

          return {
            ...prod,
            ingredientes,
            tamanhos,
            tipo: "produtos",
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)) || [];

    setCardapio(sortedData);
    setLoading(false);
  };

  useEffect(() => {
    buscarCardapio();
  }, []);

  // ---------- ABRIR MODAL ----------
  const abrirModal = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || "",
      price: item.price ?? "",
      description: item.description || "",
      dias: (item.dias || []).map(
        (n) => diasNomes.find((d) => diaMap[d] === n) // volta para nome do dia
      ),
      ingredientes: item.ingredientes || [],
      tamanhos: item.tamanhos || [],
      categoria: item.categorias?.name || "Sem categoria",
    });
    setShowModal(true);
  };

  // ---------- SALVAR EDIÇÃO ----------
  const salvarEdicao = async () => {
    try {
      // Atualiza produto (dados básicos)
      await supabase
        .from("produtos")
        .update({
          name: form.name,
          price:
            form.price === "" || form.price === null
              ? null
              : parseFloat(form.price),
          description: form.description,
          dias: form.dias.map((d) => diaMap[d]),
          img: form.img,
        })
        .eq("id", editItem.id);

      // Ingredientes (só se NÃO for bebida)
      if (form.categoria !== "Bebidas") {
        // Atualiza os existentes
        for (const ing of form.ingredientes) {
          if (ing.pi_id) {
            await supabase
              .from("produto_ingredientes")
              .update({
                obrigatorio: !!ing.obrigatorio,
                extra: !!ing.extra,
                preco_adicional:
                  ing.preco_adicional === "" || ing.preco_adicional == null
                    ? 0
                    : parseFloat(ing.preco_adicional),
              })
              .eq("id", ing.pi_id);
          }
        }
        // Remove os que foram tirados do formulário
        const pi_ids = form.ingredientes
          .map((ing) => ing.pi_id)
          .filter(Boolean);
        if (pi_ids.length > 0) {
          await supabase
            .from("produto_ingredientes")
            .delete()
            .eq("produto_id", editItem.id)
            .not("id", "in", `(${pi_ids.join(",")})`);
        } else {
          await supabase
            .from("produto_ingredientes")
            .delete()
            .eq("produto_id", editItem.id);
        }
      }

      // ---------- TAMANHOS ----------
      // Estratégia simples e segura: apaga todos e insere novamente
      await supabase
        .from("produto_tamanhos")
        .delete()
        .eq("produto_id", editItem.id);

      const tamanhosValidos = (form.tamanhos || [])
        .filter((t) => t.tamanho && t.preco !== "")
        .map((t) => ({
          produto_id: editItem.id,
          tamanho: t.tamanho,
          preco: parseFloat(t.preco),
        }));

      if (tamanhosValidos.length > 0) {
        await supabase.from("produto_tamanhos").insert(tamanhosValidos);
      }

      setShowModal(false);
      setEditItem(null);
      await buscarCardapio();
      showToast("Produto atualizado!");
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar edição!", "#ef4444");
    }
  };

  // ---------- EXCLUIR ITEM ----------
  const excluirItem = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", confirmDelete.id);

    if (!error) {
      setCardapio((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      setConfirmDelete(null);
      showToast("Excluído com sucesso!");
    } else {
      showToast("Erro ao excluir!", "#ef4444");
    }
  };

  // ---------- DRAG & DROP ----------
  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    // só permite dentro da mesma categoria
    if (source.droppableId !== destination.droppableId) return;

    const categoria = source.droppableId;
    const items = Array.from(cardapio);

    // itens da mesma categoria, ordenados por 'ordem'
    const categoriaItems = items
      .filter(
        (item) => (item.categorias?.name || "Sem categoria") === categoria
      )
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

    // aplica a movimentação
    const movedList = Array.from(categoriaItems);
    const [moved] = movedList.splice(source.index, 1);
    movedList.splice(destination.index, 0, moved);

    // reatribui 'ordem' sequencial
    const updatedById = new Map(
      movedList.map((it, idx) => [it.id, { ...it, ordem: idx }])
    );

    // atualiza a lista completa com as novas ordens da categoria
    const newItems = items.map((it) => {
      if ((it.categorias?.name || "Sem categoria") === categoria) {
        return updatedById.get(it.id) || it;
      }
      return it;
    });

    setCardapio(newItems);

    // persiste no banco
    try {
      for (let i = 0; i < movedList.length; i++) {
        const produto = movedList[i];
        await supabase
          .from("produtos")
          .update({ ordem: i })
          .eq("id", produto.id);
      }
      showToast("Ordem salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar ordem:", error);
      showToast("Erro ao salvar ordem!", "#ef4444");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[#B59275] text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
          <p className="mt-4 text-xl">Carregando cardápio...</p>
        </div>
      </div>
    );

  // Agrupa itens por categoria
  const grupos = cardapio.reduce((acc, item) => {
    const categoria = item.categorias?.name || "Sem categoria";
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(item);
    return acc;
  }, {});

  const prioridadeCategorias = [
    "Comidas",
    "Pizza",
    "Hambúrguer",
    "Bebidas",
    "Sobremesas",
    "Sem categoria",
  ];

  return (
    <div className="bg-[#B59275] flex flex-col min-h-screen text-white">
      <Header />
      <main className="flex-1">
        <h1 className="text-3xl font-bold text-center mt-6 text-gray-800">
          Meu cardápio
        </h1>

        {cardapio.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 text-white">
            <p className="text-xl font-semibold">
              Você ainda não possui itens no cardápio.
            </p>
            <p className="text-sm mt-2 opacity-80">
              Adicione seus produtos para começar!
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {Object.entries(grupos)
              .sort(
                ([a], [b]) =>
                  prioridadeCategorias.indexOf(a) -
                  prioridadeCategorias.indexOf(b)
              )
              .map(([categoria, items]) => {
                const orderedItems = [...items].sort(
                  (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
                );

                return (
                  <div key={categoria} className="mb-6">
                    <h2 className="text-2xl font-bold text-start ml-2 mt-8 mb-4 text-white">
                      {categoria}
                    </h2>

                    <Droppable droppableId={categoria}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          {orderedItems.map((e, index) => {
                            const temPrecoBase =
                              e.price !== null && e.price !== undefined;
                            return (
                              <Draggable
                                key={e.id}
                                draggableId={String(e.id)}
                                index={index}
                              >
                                {(provided) => (
                                  <div
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    ref={provided.innerRef}
                                    className="flex gap-3 p-7 border-b border-white border-opacity-30"
                                  >
                                    {e.img && (
                                      <img
                                        src={e.img}
                                        alt={e.name}
                                        style={{
                                          width: "150px",
                                          height: "auto",
                                        }}
                                        className="rounded-lg shadow-md"
                                      />
                                    )}
                                    <div className="flex flex-col items-start justify-center">
                                      <p className="font-bold text-lg">
                                        {e.name}
                                      </p>
                                      {e.description && (
                                        <p className="text-sm opacity-90">
                                          {e.description}
                                        </p>
                                      )}

                                      {/* preço base e/ou tamanhos */}
                                      {temPrecoBase && (
                                        <p className="mt-1">
                                          R$ {Number(e.price).toFixed(2)}
                                        </p>
                                      )}
                                      {e.tamanhos?.length > 0 && (
                                        <div className="mt-2 text-sm">
                                          <p className="font-semibold">
                                            Tamanhos:
                                          </p>
                                          <ul className="list-disc list-inside">
                                            {e.tamanhos.map((t) => (
                                              <li key={t.id}>
                                                {t.tamanho} — R${" "}
                                                {Number(t.preco).toFixed(2)}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      <div className="flex gap-3 mt-3">
                                        <button
                                          className="bg-[#5A4739] rounded-sm px-4 py-1 hover:bg-[#4a3a2e]"
                                          onClick={() => abrirModal(e)}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          className="bg-red-600 rounded-sm px-4 py-1 hover:bg-red-700"
                                          onClick={() => setConfirmDelete(e)}
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
          </DragDropContext>
        )}

        {/* --- MODAL EDITAR --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white rounded-xl p-6 w-[800px] text-black shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Editar Item</h2>

              {/* Nome */}
              <label className="block mb-2">
                Nome:
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </label>

              {/* Preço base (opcional) */}
              <label className="block mb-2">
                Preço base:
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </label>

              {/* Descrição */}
              <label className="block mb-2">
                Descrição:
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </label>

              {/* --- IMAGEM --- */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Imagem do produto
                </label>
                {form.img && (
                  <img
                    src={form.img}
                    alt={form.name}
                    className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 bg-gray-800 text-black w-full"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const fileName = `${Date.now()}_${file.name}`;
                    const filePath = `uploads/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                      .from("produtos")
                      .upload(filePath, file, {
                        cacheControl: "3600",
                        upsert: true,
                      });

                    if (uploadError) {
                      showToast("Erro ao enviar imagem!", "#ef4444");
                      return;
                    }

                    const { data: imgData } = supabase.storage
                      .from("produtos")
                      .getPublicUrl(filePath);

                    setForm((prev) => ({ ...prev, img: imgData.publicUrl }));
                    showToast("Imagem atualizada!");
                  }}
                  className="block w-full text-sm text-gray-500"
                />
              </div>

              {/* --- TAMANHOS --- */}
              {form.categoria?.trim().toLowerCase() !== "bebidas" && (
                <div className="mb-6">
                  <label className="block font-semibold mb-2">Tamanhos</label>
                  {form.tamanhos.map((t, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                      <input
                        type="text"
                        value={t.tamanho}
                        onChange={(e) => {
                          const copy = [...form.tamanhos];
                          copy[idx].tamanho = e.target.value;
                          setForm({ ...form, tamanhos: copy });
                        }}
                        className="w-1/2 p-2 border rounded"
                        placeholder="Tamanho (ex: Pequena, Média...)"
                      />
                      <input
                        type="number"
                        value={t.preco}
                        step="0.01"
                        onChange={(e) => {
                          const copy = [...form.tamanhos];
                          copy[idx].preco = e.target.value;
                          setForm({ ...form, tamanhos: copy });
                        }}
                        className="w-1/3 p-2 border rounded"
                        placeholder="Preço"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            tamanhos: form.tamanhos.filter((_, i) => i !== idx),
                          })
                        }
                        className="bg-red-500 text-white px-3 py-1 rounded"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() =>
                      setForm({
                        ...form,
                        tamanhos: [
                          ...form.tamanhos,
                          { tamanho: "", preco: "" },
                        ],
                      })
                    }
                  >
                    + Adicionar tamanho
                  </button>
                </div>
              )}

              {/* --- INGREDIENTES (oculto para Bebidas) --- */}
              {form.categoria !== "Bebidas" && form.ingredientes.length > 0 && (
                <div className="mb-6">
                  <label className="block font-semibold mb-2">
                    Ingredientes
                  </label>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {form.ingredientes.map((ing, idx) => (
                      <div
                        key={ing.uid || ing.pi_id || ing.id}
                        className="flex gap-3 items-center"
                      >
                        <span className="min-w-[150px]">{ing.name}</span>

                        <label className="flex items-center gap-1">
                          <span>Obrigatório</span>
                          <input
                            type="checkbox"
                            checked={!!(ing.obrigatorio ?? false)}
                            onChange={() =>
                              setForm((prev) => ({
                                ...prev,
                                ingredientes: prev.ingredientes.map((i, iIdx) =>
                                  iIdx === idx
                                    ? {
                                        ...i,
                                        obrigatorio: !(i.obrigatorio ?? false),
                                      }
                                    : i
                                ),
                              }))
                            }
                          />
                        </label>

                        <label className="flex items-center gap-1">
                          <span>Extra</span>
                          <input
                            type="checkbox"
                            checked={!!(ing.extra ?? false)}
                            onChange={() =>
                              setForm((prev) => ({
                                ...prev,
                                ingredientes: prev.ingredientes.map((i, iIdx) =>
                                  iIdx === idx
                                    ? { ...i, extra: !(i.extra ?? false) }
                                    : i
                                ),
                              }))
                            }
                          />
                        </label>

                        <input
                          type="number"
                          value={ing.preco_adicional ?? 0}
                          step="0.01"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setForm((prev) => ({
                              ...prev,
                              ingredientes: prev.ingredientes.map((i, iIdx) =>
                                iIdx === idx
                                  ? { ...i, preco_adicional: value }
                                  : i
                              ),
                            }));
                          }}
                          className="w-28 p-1 border rounded"
                          placeholder="Preço add"
                        />

                        {/* Botão remover */}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              ingredientes: prev.ingredientes.filter(
                                (_, iIdx) => iIdx !== idx
                              ),
                            }))
                          }
                          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- DIAS --- */}
              <div className="mb-4">
                <label className="block font-semibold mb-2">
                  Dias disponíveis
                </label>
                <div className="flex flex-wrap gap-3">
                  {diasNomes.map((dia) => (
                    <label
                      key={dia}
                      className="flex items-center gap-2 text-sm bg-[#B59275] px-3 py-1 rounded-lg cursor-pointer hover:opacity-90 text-white"
                    >
                      <input
                        type="checkbox"
                        checked={form.dias.includes(dia)}
                        onChange={() => handleDiaChange(dia)}
                      />
                      {dia}
                    </label>
                  ))}
                </div>
              </div>

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

        {/* --- CONFIRMAR EXCLUSÃO --- */}
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
      </main>
      <Footer />
    </div>
  );
}

export default MeuCardapio;
