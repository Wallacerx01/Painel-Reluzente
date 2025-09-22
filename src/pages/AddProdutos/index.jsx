import { useState, useEffect } from "react";
import supabase from "../../supabaseClient";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

function AddProdutos() {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState(""); // preço "principal" (pode ser opcional agora)
  const [img, setImg] = useState(null);
  const [dias, setDias] = useState([]);

  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");

  // ingredientes
  const [ingredientes, setIngredientes] = useState([]);
  const [selectedIngredientes, setSelectedIngredientes] = useState([]);

  // tamanhos
  const [tamanhos, setTamanhos] = useState([{ tamanho: "", preco: "" }]);

  const diaMap = {
    Domingo: 0,
    Segunda: 1,
    Terça: 2,
    Quarta: 3,
    Quinta: 4,
    Sexta: 5,
    Sábado: 6,
  };

  useEffect(() => {
    const fetchCategorias = async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error) setCategorias(data || []);
    };

    const fetchIngredientes = async () => {
      const { data, error } = await supabase
        .from("ingredientes")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error) setIngredientes(data || []);
    };

    fetchCategorias();
    fetchIngredientes();
  }, []);

  const handleDiaChange = (dia) => {
    setDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleSelectIngrediente = (ing) => {
    setSelectedIngredientes((prev) => {
      const exists = prev.find((sel) => sel.id === ing.id);
      if (exists) {
        return prev.filter((sel) => sel.id !== ing.id);
      } else {
        return [
          ...prev,
          { ...ing, obrigatorio: false, extra: false, preco_adicional: 0 },
        ];
      }
    });
  };

  const updateIngrediente = (id, field, value) => {
    setSelectedIngredientes((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  // funções tamanhos
  const handleTamanhoChange = (index, field, value) => {
    const novos = [...tamanhos];
    novos[index][field] = value;
    setTamanhos(novos);
  };

  const addTamanho = () => {
    setTamanhos([...tamanhos, { tamanho: "", preco: "" }]);
  };

  const removeTamanho = (index) => {
    setTamanhos(tamanhos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userError || !userId) {
      Toastify({
        text: "Usuário não autenticado!",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ef4444" },
      }).showToast();
      return;
    }

    let imageUrl = null;
    if (img) {
      const fileName = `${Date.now()}_${img.name}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("produtos")
        .upload(filePath, img);

      if (uploadError) {
        Toastify({
          text: "Erro ao enviar imagem: " + uploadError.message,
          duration: 3000,
          gravity: "top",
          position: "right",
          style: { background: "#ef4444" },
        }).showToast();
        return;
      }

      const { data: imgData } = supabase.storage
        .from("produtos")
        .getPublicUrl(filePath);

      imageUrl = imgData.publicUrl;
    }

    try {
      // cria produto
      const { data: produtoData, error: insertError } = await supabase
        .from("produtos")
        .insert([
          {
            name: nome,
            description: descricao,
            price: preco ? parseFloat(preco) : null,
            img: imageUrl,
            categoria_id: categoriaId || null,
            dias: dias.map((d) => diaMap[d]),
          },
        ])
        .select("id")
        .single();

      if (insertError) throw insertError;

      // vincula produto ao usuário
      await supabase.from("usuario_produtos").insert([
        {
          usuario_id: userId,
          produto_id: produtoData.id,
        },
      ]);

      // vincula categoria ao usuário (se não tiver)
      if (categoriaId) {
        const { data: existente } = await supabase
          .from("usuario_categorias")
          .select("id")
          .eq("usuario_id", userId)
          .eq("categoria_id", categoriaId)
          .maybeSingle();

        if (!existente) {
          await supabase.from("usuario_categorias").insert([
            {
              usuario_id: userId,
              categoria_id: categoriaId,
            },
          ]);
        }
      }

      // vincula ingredientes (só se não for Bebidas e houver ingredientes selecionados)
      if (categoriaId && !isBebida && selectedIngredientes.length > 0) {
        const relacoes = selectedIngredientes.map((ing) => ({
          produto_id: produtoData.id,
          ingrediente_id: ing.id,
          obrigatorio: ing.obrigatorio || false,
          extra: ing.extra || false,
          preco_adicional: ing.preco_adicional
            ? parseFloat(ing.preco_adicional)
            : 0,
        }));

        await supabase.from("produto_ingredientes").insert(relacoes);
      }

      // salva tamanhos
      if (tamanhos.length > 0 && tamanhos[0].tamanho) {
        const tamanhosData = tamanhos
          .filter((t) => t.tamanho && t.preco)
          .map((t) => ({
            produto_id: produtoData.id,
            tamanho: t.tamanho,
            preco: parseFloat(t.preco),
          }));

        if (tamanhosData.length > 0) {
          await supabase.from("produto_tamanhos").insert(tamanhosData);
        }
      }

      Toastify({
        text: "Produto salvo com sucesso!",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#008000" },
      }).showToast();

      // reset
      setNome("");
      setDescricao("");
      setPreco("");
      setDias([]);
      setImg(null);
      setCategoriaId("");
      setSelectedIngredientes([]);
      setTamanhos([{ tamanho: "", preco: "" }]);
      const inputFile = document.getElementById("imgInput");
      if (inputFile) inputFile.value = "";
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      Toastify({
        text: "Erro ao salvar: " + error.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ef4444" },
      }).showToast();
    }
  };

  // Categoria selecionada e checagem robusta para "Bebidas"
  const selectedCategoria = categorias.find(
    (cat) => String(cat.id) === String(categoriaId)
  );
  const isBebida =
    !!selectedCategoria &&
    String(selectedCategoria.name || "")
      .trim()
      .toLowerCase() === "bebidas";

  return (
    <div className="flex flex-col min-h-screen bg-[#B59275]">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-10">
        <section className="bg-[#5A4739] w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <h1 className="text-3xl text-white font-extrabold mb-6 tracking-wide">
              Adicionar Produto
            </h1>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 text-white"
            >
              {/* Categoria */}
              <div>
                <label className="text-sm font-semibold">Categoria</label>
                <select
                  value={categoriaId}
                  onChange={(e) => {
                    setCategoriaId(e.target.value);
                    setSelectedIngredientes([]); // limpa ingredientes ao mudar categoria
                  }}
                  className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 w-full text-black"
                  required
                >
                  <option value="">Selecione...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome */}
              <div>
                <label className="text-sm font-semibold">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 w-full text-black"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-sm font-semibold">Descrição</label>
                <textarea
                  rows="3"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 w-full text-black resize-none"
                />
              </div>

              {/* Preço principal */}
              <div>
                <label className="text-sm font-semibold">Preço base (R$)</label>
                <input
                  type="number"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 w-full text-black"
                />
              </div>
              {/* Imagem */}
              <div>
                <label className="text-sm font-semibold">Imagem</label>
                <input
                  id="imgInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImg(e.target.files[0])}
                  className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 bg-white text-black w-full"
                />
              </div>

              {/* Tamanhos */}
              {!isBebida && (
                <div>
                  <label className="text-sm font-semibold">
                    Tamanhos e preços
                  </label>
                  <div className="space-y-3 mt-2">
                    {tamanhos.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-[#B59275] p-2 rounded-lg"
                      >
                        <input
                          type="text"
                          placeholder="Tamanho"
                          value={t.tamanho}
                          onChange={(e) =>
                            handleTamanhoChange(i, "tamanho", e.target.value)
                          }
                          className="w-32 p-1 rounded text-black text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Preço"
                          value={t.preco}
                          onChange={(e) =>
                            handleTamanhoChange(i, "preco", e.target.value)
                          }
                          className="w-28 p-1 rounded text-black text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeTamanho(i)}
                          className="bg-red-500 text-white px-2 rounded text-xs"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTamanho}
                      className="bg-green-500 text-white px-3 py-1 rounded text-xs"
                    >
                      + Adicionar tamanho
                    </button>
                  </div>
                </div>
              )}

              {/* Dias */}
              <div>
                <label className="text-sm font-semibold">
                  Dias disponíveis
                </label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {Object.keys(diaMap).map((dia) => (
                    <label
                      key={dia}
                      className="flex items-center gap-2 text-sm bg-[#B59275] px-3 py-1 rounded-lg cursor-pointer hover:opacity-90"
                    >
                      <input
                        type="checkbox"
                        checked={dias.includes(dia)}
                        onChange={() => handleDiaChange(dia)}
                      />
                      {dia}
                    </label>
                  ))}
                </div>
              </div>

              {/* Ingredientes (só aparece quando uma categoria foi escolhida E não é Bebidas) */}
              {categoriaId && !isBebida && (
                <div>
                  <label className="text-sm font-semibold">Ingredientes</label>
                  <div className="space-y-3 mt-2 max-h-64 overflow-y-auto pr-2">
                    {ingredientes.map((ing) => {
                      const selected = selectedIngredientes.find(
                        (sel) => sel.id === ing.id
                      );

                      return (
                        <div
                          key={ing.id}
                          className="flex flex-col gap-2 p-2 rounded-lg bg-[#B59275]"
                        >
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() => handleSelectIngrediente(ing)}
                            />
                            {ing.name}
                          </label>

                          {selected && (
                            <div className="flex flex-wrap gap-4 ml-6">
                              <label className="flex gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={selected.obrigatorio}
                                  onChange={(e) =>
                                    updateIngrediente(
                                      ing.id,
                                      "obrigatorio",
                                      e.target.checked
                                    )
                                  }
                                />
                                Obrigatório
                              </label>
                              <label className="flex gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={selected.extra}
                                  onChange={(e) =>
                                    updateIngrediente(
                                      ing.id,
                                      "extra",
                                      e.target.checked
                                    )
                                  }
                                />
                                Extra
                              </label>
                              <input
                                type="number"
                                placeholder="Preço adicional"
                                value={selected.preco_adicional}
                                onChange={(e) =>
                                  updateIngrediente(
                                    ing.id,
                                    "preco_adicional",
                                    e.target.value
                                  )
                                }
                                className="w-28 p-1 rounded text-black text-xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="bg-[#B59275] text-white rounded-xl font-bold p-3 mt-4 
              hover:bg-[#d3ab8b] hover:text-gray-900 hover:scale-105 transition-all duration-200 shadow-md"
              >
                Salvar
              </button>
            </form>
          </div>
          <div className="hidden md:flex p-8 md:p-10 bg-[#B59275] text-white flex-col justify-center text-center">
            <h2 className="text-2xl font-bold mb-4">Organize seu cardápio</h2>
            <p>
              Cadastre pratos e bebidas com imagem, descrição e preço. Agora com
              múltiplos tamanhos e valores, evitando produtos repetidos.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default AddProdutos;
