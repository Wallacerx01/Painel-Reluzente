import { useEffect, useState, useRef } from "react";
import supabase from "../../supabaseClient";
import { Howl } from "howler";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import alertSound from "../../audio/alert.mp3";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const audioNovoPedidoSrc = alertSound;

function PainelPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("📡 Aguardando novos pedidos...");
  const [somAtivo, setSomAtivo] = useState(false);
  const [userId, setUserId] = useState(null);

  const audioNovoPedido = useRef(null);
  const pedidosAtuais = useRef(new Set());
  const somAtivoRef = useRef(somAtivo);

  // Atualiza ref do som
  useEffect(() => {
    somAtivoRef.current = somAtivo;
  }, [somAtivo]);

  // Pega usuário logado dinamicamente
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) setUserId(session.user.id);
        else setUserId(null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const tocarSom = (ativo) => {
    if (ativo && audioNovoPedido.current) {
      audioNovoPedido.current.stop();
      audioNovoPedido.current.play();
    }
  };

  useEffect(() => {
    if (!audioNovoPedido.current) {
      audioNovoPedido.current = new Howl({
        src: [audioNovoPedidoSrc],
        volume: 0.5,
      });
    }

    if (!userId) return;

    const fetchPedidosUsuario = async () => {
      try {
        const agora = new Date();
        const limite = new Date(agora.getTime() - 12 * 60 * 60 * 1000);

        const { data: usuarioPedidos, error: upError } = await supabase
          .from("usuario_pedidos")
          .select("pedidos_id")
          .eq("usuario_id", userId);

        if (upError) throw upError;

        const pedidosIds = usuarioPedidos.map((p) => p.pedidos_id);
        if (pedidosIds.length === 0) {
          setPedidos([]);
          setLoading(false);
          return;
        }

        const { data: pedidosData, error: pError } = await supabase
          .from("pedidos")
          .select("*")
          .in("id", pedidosIds)
          .gte("created_at", limite.toISOString())
          .order("id", { ascending: false });

        if (pError) throw pError;

        setPedidos(pedidosData);
        pedidosData.forEach((p) => pedidosAtuais.current.add(p.numero || p.id));
        setLoading(false);

        if (pedidosData.length > 0 && somAtivoRef.current) {
          tocarSom(true);
          setStatusMsg("📦 Pedido carregado!");
          setTimeout(
            () => setStatusMsg("📡 Aguardando novos pedidos..."),
            3000
          );
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    const escutarPedidosUsuario = async () => {
      const channel = supabase
        .channel("pedidos-listener")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pedidos" },
          async (payload) => {
            const pedido = payload.new;

            const { data: usuarioPedido } = await supabase
              .from("usuario_pedidos")
              .select("*")
              .eq("usuario_id", userId)
              .eq("pedidos_id", pedido.id)
              .single();

            if (!usuarioPedido) return;

            const agora = new Date();
            const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);
            const createdAt = new Date(pedido.created_at);

            if (
              !pedidosAtuais.current.has(pedido.numero || pedido.id) &&
              createdAt.getTime() >= umaHoraAtras.getTime()
            ) {
              pedidosAtuais.current.add(pedido.numero || pedido.id);
              setPedidos((prev) => [pedido, ...prev]);
              setStatusMsg("📦 Novo pedido recebido!");

              Toastify({
                text: `Novo pedido recebido!`,
                duration: 5000,
                gravity: "top",
                position: "center",
                style: { background: "#008000" },
              }).showToast();

              tocarSom(somAtivoRef.current);
              await imprimirPedidoWS(pedido);

              setTimeout(() => {
                setStatusMsg("📡 Aguardando novos pedidos...");
              }, 3000);
            }
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    };

    fetchPedidosUsuario();
    escutarPedidosUsuario();
  }, [userId]);

  const ativarSom = () => {
    const novoEstado = !somAtivo;
    setSomAtivo(novoEstado);
    if (novoEstado) {
      setStatusMsg("🔊 Som ativado com sucesso!");
      tocarSom(novoEstado);
    } else {
      setStatusMsg("🔇 Som desativado!");
    }

    setTimeout(() => {
      setStatusMsg("📡 Aguardando novos pedidos...");
    }, 3000);
  };

  // ------------------ NOVA FUNÇÃO DE IMPRESSÃO VIA agent.py ------------------
  const removerAcentos = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");
  };

  const imprimirPedidoWS = async (pedido) => {
    try {
      const ws = new WebSocket("ws://localhost:12345");

      ws.onopen = () => {
        console.log("✅ Conectado ao agente Python");

        // Normaliza itens (remove "0x" e linhas de Obs:)
        const itensArray = Array.isArray(pedido.itens)
          ? pedido.itens.filter((i) => !i.trim().startsWith("0x"))
          : pedido.itens
          ? pedido.itens.split("\n").filter((i) => !i.trim().startsWith("0x"))
          : [];

        const itensFormatados = itensArray
          .map((item) => {
            const linhas = item
              .split("\n")
              .filter((l) => !/^Obs:/i.test(l.trim())); // remove Obs:
            const produto = linhas[0];
            const ingredientes = linhas.slice(1).filter((l) => l.trim() !== "");
            return [produto, ...ingredientes].join("\n");
          })
          .join("\n");

        // Observações
        let somenteObs = "";
        if (pedido.observacao) {
          const match = pedido.observacao.match(/Obs:\s*(.*)/i);
          if (match) somenteObs = match[1].trim();
        }

        // Texto principal sem acentos
        let texto = `
Cliente: ${pedido.cliente}

Itens:
${itensFormatados}
`;

        if (somenteObs) {
          texto += `Obs: ${somenteObs}\n`;
        }

        texto += `
Forma de pagamento: ${pedido.pagamento}
Taxa de entrega: R$${Number(pedido.taxa).toFixed(2)}
Total: R$${Number(pedido.total).toFixed(2)}
${pedido.endereco ? `Endereço: ${pedido.endereco}\n` : ""}`;

        // Remove acentos antes de enviar
        texto = removerAcentos(texto);

        // Envia para o Python, número do pedido separado
        ws.send(JSON.stringify({ texto, numero: pedido.numero || pedido.id }));

        ws.onmessage = (msg) => {
          console.log("Resposta do agente:", msg.data);
          ws.close();
        };
      };

      ws.onerror = (err) => console.error("Erro na conexão WebSocket:", err);
    } catch (err) {
      console.error("Erro ao imprimir via WebSocket:", err);
    }
  };

  // ---------------------------------------------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      const umaHoraAtras = Date.now() - 12 * 60 * 60 * 1000;
      setPedidos((prev) =>
        prev.filter((p) => new Date(p.created_at).getTime() >= umaHoraAtras)
      );
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const formatarHora = (data) => {
    const d = new Date(data);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatarData = (data) => {
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = String(d.getFullYear()).slice(-2);
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <main className="bg-[#F5F5F5] w-screen h-screen flex flex-col">
      <div>
        <Header />
        <h1 className="text-3xl font-bold text-center mt-6 text-gray-800">
          Painel de Pedidos
        </h1>
        <div className="flex justify-start gap-4 ml-5">
          <button
            onClick={ativarSom}
            className={`text-white px-4 py-2 rounded shadow transition ${
              somAtivo
                ? "bg-amber-500 hover:bg-amber-700"
                : "bg-blue-600 hover:bg-blue-700"
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
                <div className="flex gap-10">
                  <p>
                    <span className="font-bold">🕒 Hora:</span>{" "}
                    {formatarHora(pedido.created_at)}
                  </p>
                  <p>
                    <span className="font-bold">📅 Data:</span>{" "}
                    {formatarData(pedido.created_at)}
                  </p>
                </div>
                <p>
                  <span className="font-bold">👤 Cliente:</span>{" "}
                  {pedido.cliente}
                </p>
                <p>
                  <span className="font-bold">🛒 Itens:</span>
                </p>
                <ul className="ml-4 list-disc">
                  {Array.isArray(pedido.itens)
                    ? pedido.itens
                        .filter((item) => !item.trim().startsWith("0x"))
                        .map((item, idx) => <li key={idx}>{item}</li>)
                    : pedido.itens
                    ? pedido.itens
                        .split("\n")
                        .filter((item) => !item.trim().startsWith("0x"))
                        .map((item, idx) => <li key={idx}>{item.trim()}</li>)
                    : "Nenhum item"}
                </ul>
                <p>
                  <span className="font-bold">💳 Pagamento:</span>{" "}
                  {pedido.pagamento}
                </p>
                <button
                  onClick={() => imprimirPedidoWS(pedido)}
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
