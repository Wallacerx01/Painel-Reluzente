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

    // Listener para mudanças de login/logout
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

    if (!userId) return; // espera o userId estar definido

    const fetchPedidosUsuario = async () => {
      try {
        const agora = new Date();
        const limite = new Date(agora.getTime() - 12 * 60 * 60 * 1000); // últimos 12 horas

        // Pega os pedidos do usuário
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

        // Pega os detalhes dos pedidos já filtrando por data
        const { data: pedidosData, error: pError } = await supabase
          .from("pedidos")
          .select("*")
          .in("id", pedidosIds)
          .gte("created_at", limite.toISOString()) // aqui filtramos pelo período
          .order("id", { ascending: false });

        if (pError) throw pError;

        setPedidos(pedidosData);

        // Adiciona ao Set para evitar duplicados no listener
        pedidosData.forEach((p) => pedidosAtuais.current.add(p.numero || p.id));

        setLoading(false);

        // Toca som no primeiro pedido, se houver
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
      await conectarQZ();

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

    fetchPedidosUsuario();
    escutarPedidosUsuario();
  }, [userId]);

  const ativarSom = () => {
    const novoEstado = !somAtivo;
    setSomAtivo(novoEstado);
    if (novoEstado) {
      setStatusMsg("🔊 Som ativado com sucesso!");
      tocarSom(novoEstado); // toca imediatamente
    } else {
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
    if (Array.isArray(itens)) {
      return itens.filter((i) => !i.trim().startsWith("0x")); // remove ingredientes zerados
    }

    if (typeof itens === "string") {
      return itens
        .split(",")
        .map((i) => i.trim())
        .filter((i) => !i.startsWith("0x")); // remove ingredientes zerados
    }

    return [];
  };

  const imprimirPedido = async (pedido) => {
    if (typeof window.qz === "undefined") return;

    const config = window.qz.configs.create("POS-80");

    // Normaliza itens (array ou string)
    const itensArray = normalizarItens(pedido.itens);

    // Formata cada item no estilo cartItems
    const itensFormatados = itensArray
      .map((item) => {
        const linhas = item.split("\n");

        const produto = linhas[0]; // primeira linha = produto
        const ingredientes = [];

        for (let i = 1; i < linhas.length; i++) {
          const linha = linhas[i].trim();

          if (!linha) continue;

          if (linha.toLowerCase().startsWith("obs:")) {
            // ignora a linha de observação (mas não corta o resto)
            continue;
          }

          ingredientes.push(linha);
        }

        return [produto, ...ingredientes].join("<br>");
      })
      .join("<br><br>");

    // Extrair somente o texto depois de "Obs:"
    let somenteObs = "";
    if (pedido.observacao) {
      const match = pedido.observacao.match(/Obs:\s*(.*)/i);
      if (match) {
        somenteObs = match[1].trim();
      }
    }
    // Monta recibo
    const html = `
<h2>Pedido: ${pedido.numero || pedido.id}</h2>


<p><b>Cliente:</b> ${pedido.cliente}</p>
<p><b>Itens:</b><p>

${itensFormatados}

<p>${somenteObs ? `Obs: ${somenteObs}\n\n` : ""}</p>

<p>Forma de pagamento: ${pedido.pagamento}</p>
<p>Taxa de entrega: R$${Number(pedido.taxa).toFixed(2)}</p>
<p>Total: R$${Number(pedido.total).toFixed(2)}</p>
<p>${pedido.endereco ? `<p>Endereço: ${pedido.endereco}</p>` : ""}
`;

    // Envia para impressão como texto cru (plain)
    const data = [{ type: "html", format: "plain", data: html }];
    await window.qz.print(config, data).catch((err) => console.error(err));
  };

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
    const mes = String(d.getMonth() + 1).padStart(2, "0"); // meses começam do 0
    const ano = String(d.getFullYear()).slice(-2); // pega os dois últimos dígitos
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
                {" "}
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
                        .filter((item) => !item.trim().startsWith("0x")) // remove ingredientes zerados
                        .map((item, idx) => <li key={idx}>{item}</li>)
                    : pedido.itens
                    ? pedido.itens
                        .split("\n") // quebra por linha, já que vem formatado
                        .filter((item) => !item.trim().startsWith("0x")) // remove "0x"
                        .map((item, idx) => <li key={idx}>{item.trim()}</li>)
                    : "Nenhum item"}
                </ul>
                <p>
                  <span className="font-bold">💳 Pagamento:</span>{" "}
                  {pedido.pagamento}
                </p>
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
