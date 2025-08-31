import { useEffect, useState, useRef } from "react";
import supabase from "../../supabaseClient";
import { Howl } from "howler";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// Definindo o caminho do som uma vez
const audioNovoPedidoSrc = "/src/assets/alert.mp3";

function PainelPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("📡 Aguardando novos pedidos...");
  const [somAtivo, setSomAtivo] = useState(false);
  const audioNovoPedido = useRef(null);
  const pedidosAtuais = useRef(new Set());
  const somAtivoRef = useRef(somAtivo);

  useEffect(() => {
    somAtivoRef.current = somAtivo;
  }, [somAtivo]);

  // ---------------- Inicializa o som e o canal de escuta ----------------
  useEffect(() => {
    if (!audioNovoPedido.current) {
      audioNovoPedido.current = new Howl({
        src: [audioNovoPedidoSrc],
        volume: 0.5,
      });
    }

    const fetchPedidos = async () => {
      const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .gte("created_at", umaHoraAtras)
        .order("id", { ascending: false });

      if (error) console.error("Erro ao buscar pedidos:", error);
      else setPedidos(data);
      setLoading(false);
    };

    const escutarPedidos = async () => {
      await conectarQZ();

      const channel = supabase
        .channel("pedidos-listener")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pedidos" },
          async (payload) => {
            const pedido = payload.new;
            const umaHoraAtras = Date.now() - 60 * 60 * 1000;

            if (
              !pedidosAtuais.current.has(pedido.numero || pedido.id) &&
              new Date(pedido.created_at).getTime() >= umaHoraAtras
            ) {
              pedidosAtuais.current.add(pedido.numero || pedido.id);
              setPedidos((prev) => [pedido, ...prev]);
              setStatusMsg("📦 Novo pedido recebido!");

              // 🔊 toca som ao receber novo pedido
              if (somAtivoRef.current && audioNovoPedido.current) {
                audioNovoPedido.current.play();
              }

              await imprimirPedido(pedido);

              setTimeout(() => {
                setStatusMsg("📡 Aguardando novos pedidos...");
              }, 3000);
            }
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    };

    fetchPedidos();
    escutarPedidos();
  }, []);

  // ---------------- BOTÃO ATIVAR SOM ----------------
  const ativarSom = () => {
    if (!somAtivo) {
      setSomAtivo(true);
      setStatusMsg("🔊 Som ativado com sucesso!");
      if (audioNovoPedido.current) {
        audioNovoPedido.current.play(); // 🔊 toca imediatamente
      }
    } else {
      setSomAtivo(false);
      setStatusMsg("🔇 Som desativado!");
    }

    setTimeout(() => {
      setStatusMsg("📡 Aguardando novos pedidos...");
    }, 3000);
  };

  const conectarQZ = async () => {
    let tentativas = 0;
    while (typeof window.qz === "undefined" || !window.qz.websocket) {
      await new Promise((r) => setTimeout(r, 100));
      tentativas++;
      if (tentativas > 50) {
        console.error("QZ Tray não disponível");
        return false;
      }
    }
    if (!window.qz.websocket.isActive()) {
      await window.qz.websocket.connect();
      console.log("✅ Conectado ao QZ Tray");
    }
    return true;
  };

  const normalizarItens = (itens) => {
    if (Array.isArray(itens)) return itens;
    if (typeof itens === "string") return itens.split(",").map((i) => i.trim());
    return [];
  };

  const imprimirPedido = async (pedido) => {
    if (typeof window.qz === "undefined") return;

    const config = window.qz.configs.create("POS-80");
    const itensArray = normalizarItens(pedido.itens);

    const html = `
      <h2>Pedido #${pedido.numero || pedido.id}</h2>
      <p><b>Cliente:</b> ${pedido.cliente}</p>
      <p><b>Itens:</b></p>
      ${itensArray.map((i) => `<p>${i}</p>`).join("")}
      ${pedido.observacao ? `<p>Observação: ${pedido.observacao}</p>` : ""}
      <p>Forma de pagamento: ${pedido.pagamento}</p>
      <p>Taxa de entrega: R$${pedido.taxa.toFixed(2)}</p>
      <p>Total: R$${Number(pedido.total).toFixed(2)}</p>
      ${pedido.endereco ? `<p>Endereço: ${pedido.endereco}</p>` : ""}
    `;

    const data = [{ type: "html", format: "plain", data: html }];
    await window.qz.print(config, data).catch((err) => console.error(err));
  };

  // ---------------- LIMPAR PEDIDOS ANTIGOS A CADA 5 MIN ----------------
  useEffect(() => {
    const interval = setInterval(() => {
      const umaHoraAtras = Date.now() - 60 * 60 * 1000;
      setPedidos((prev) =>
        prev.filter((p) => new Date(p.created_at).getTime() >= umaHoraAtras)
      );
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const formatarHora = (data) => {
    const d = new Date(data);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="bg-[#F5F5F5] w-screen h-screen flex flex-col">
      <div>
        <Header />
        <h1 className="text-3xl font-bold text-center mt-6 text-gray-800">
          Painel de Pedidos
        </h1>
        <div className="flex justify-end gap-4 mr-5">
          <button
            onClick={ativarSom}
            className={`px-3 py-1 rounded-lg shadow transition ${
              somAtivo
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {somAtivo ? "Desativar Som" : "Ativar Som"}
          </button>
        </div>
      </div>

      <p className="text-center p-2 text-gray-600">{statusMsg}</p>

      <section className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p>Carregando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p>Nenhum pedido encontrado na última hora.</p>
        ) : (
          <ul className="space-y-3">
            {pedidos.map((pedido) => (
              <li
                key={pedido.id}
                className="p-4 bg-white shadow rounded-lg border border-gray-200"
              >
                <p>
                  <span className="font-bold">🕒 Hora:</span>{" "}
                  {formatarHora(pedido.created_at)}
                </p>
                <p>
                  <span className="font-bold">👤 Cliente:</span>{" "}
                  {pedido.cliente}
                </p>
                <p>
                  <span className="font-bold">🛒 Itens:</span>
                </p>
                <ul className="ml-4 list-disc">
                  {Array.isArray(pedido.itens)
                    ? pedido.itens.map((item, idx) => <li key={idx}>{item}</li>)
                    : pedido.itens
                    ? pedido.itens
                        .split(",")
                        .map((item, idx) => <li key={idx}>{item.trim()}</li>)
                    : "Nenhum item"}
                </ul>
                <p>
                  <span className="font-bold">💳 Pagamento:</span>{" "}
                  {pedido.pagamento}
                </p>

                {/* 🔘 Botão Manual de Impressão */}
                <button
                  onClick={() => imprimirPedido(pedido)}
                  className="mt-3 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🖨️ Imprimir Manualmente
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </main>
  );
}

export default PainelPedidos;
