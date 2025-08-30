import { useState } from "react";
import supabase from "../../supabaseClient";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

function AddProdutos() {
  const [tipo, setTipo] = useState("pratos");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [img, setImg] = useState(null);
  const [dias, setDias] = useState([]);
  const [feijoes, setFeijoes] = useState("");
  const [carnes, setCarnes] = useState("");

  // Mapeamento de dias para números
  const diaMap = {
    Segunda: 1,
    Terça: 2,
    Quarta: 3,
    Quinta: 4,
    Sexta: 5,
    Sábado: 6,
  };

  const handleDiaChange = (dia) => {
    setDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = null;
    if (img) {
      const fileName = `${Date.now()}_${img.name}`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(tipo)
        .upload(filePath, img);

      if (uploadError) {
        alert("Erro ao enviar imagem! " + uploadError.message);
        return;
      }

      const { data: imgData } = supabase.storage
        .from(tipo)
        .getPublicUrl(filePath);
      imageUrl = imgData.publicUrl;
    }

    const novoItem = {
      name: nome,
      description: descricao,
      price: parseFloat(preco),
      img: imageUrl,
    };

    if (tipo === "pratos") {
      // dias como inteiros
      novoItem.dias = dias.map((d) => diaMap[d]);
      // feijoes e carnes como text[]
      novoItem.feijoes = feijoes ? feijoes.split(",").map((f) => f.trim()) : [];
      novoItem.carnes = carnes ? carnes.split(",").map((c) => c.trim()) : [];
    }

    const { error: insertError } = await supabase.from(tipo).insert([novoItem]);

    if (insertError) {
      Toastify({
        text: "Erro ao salvar: " + insertError.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#ef4444" },
      }).showToast();
    } else {
      Toastify({
        text: `${tipo === "pratos" ? "Prato" : "Bebida"} salva com sucesso!`,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#008000" },
      }).showToast();

      // Reset completo do formulário
      setNome("");
      setDescricao("");
      setPreco("");
      setDias([]);
      setFeijoes("");
      setCarnes("");
      setImg(null);
      // Reset do input de arquivo
      document.getElementById("imgInput").value = "";
    }
  };

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
              {/* Tipo */}
              <div>
                <label className="text-sm font-semibold">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 w-full text-black"
                >
                  <option value="pratos">Prato</option>
                  <option value="bebidas">Bebida</option>
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

              {/* Preço */}
              <div>
                <label className="text-sm font-semibold">Preço (R$)</label>
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

              {/* Campos exclusivos de prato */}
              {tipo === "pratos" && (
                <>
                  <div>
                    <label className="text-sm font-semibold">
                      Dias disponíveis
                    </label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {[
                        "Segunda",
                        "Terça",
                        "Quarta",
                        "Quinta",
                        "Sexta",
                        "Sábado",
                      ].map((dia) => (
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

                  <div>
                    <label className="text-sm font-semibold">
                      Tipos de feijão (separados por vírgula)
                    </label>
                    <input
                      type="text"
                      value={feijoes}
                      onChange={(e) => setFeijoes(e.target.value)}
                      className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 w-full text-black"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Carnes (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      value={carnes}
                      onChange={(e) => setCarnes(e.target.value)}
                      className="mt-2 rounded-lg border border-gray-300 outline-0 p-2 w-full text-black"
                    />
                  </div>
                </>
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

          <div className="hidden md:flex bg-[#B59275] items-center justify-center p-10">
            <div className="text-center text-white max-w-sm">
              <h2 className="text-2xl font-bold mb-4">Organize seu cardápio</h2>
              <p className="text-sm opacity-90">
                Cadastre pratos e bebidas com imagem, descrição e preço.
                Facilite a visualização do seu menu e mantenha tudo atualizado
                em segundos.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default AddProdutos;
