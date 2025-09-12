import { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const formatarDataCurta = (dataString) => {
  if (!dataString) return "";
  const d = new Date(dataString);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const formatarDataSelecionada = (dataStr) => {
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano.slice(-2)}`;
};

function Relatorios() {
  const [pedidos, setPedidos] = useState([]);
  const [resumo, setResumo] = useState({
    pedidosHoje: 0,
    faturamentoHoje: 0,
    ticketMedio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split("T")[0]
  );

  const COLORS = [
    "#FF6B6B",
    "#FFA500",
    "#FFD93D",
    "#6BCB77",
    "#4D96FF",
    "#9D4EDD",
  ];
  const COLORS_TOP5 = ["#FF3B3B", "#FF8C00", "#FFD700", "#32CD32", "#1E90FF"];

  // Buscar pedidos
  useEffect(() => {
    const fetchPedidos = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar pedidos:", error);
        setLoading(false);
        return;
      }

      setPedidos(data);

      // Resumo do dia (sem taxa do entregador)
      const pedidosDoDia = data.filter(
        (p) => p.created_at.split("T")[0] === dataSelecionada
      );

      const faturamentoDoDia = pedidosDoDia.reduce(
        (acc, cur) =>
          acc + Number((cur.total || cur.valor || 0) - (cur.taxa || 0)),
        0
      );

      const ticketMedio =
        pedidosDoDia.length > 0 ? faturamentoDoDia / pedidosDoDia.length : 0;

      setResumo({
        pedidosHoje: pedidosDoDia.length,
        faturamentoHoje: faturamentoDoDia,
        ticketMedio,
      });

      setLoading(false);
    };

    fetchPedidos();
  }, [dataSelecionada]);

  // Pedidos por mês
  const pedidosPorMes = Object.values(
    pedidos.reduce((acc, p) => {
      const d = new Date(p.created_at);
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();
      const chave = `${mes}/${ano}`;

      if (!acc[chave]) {
        acc[chave] = { mes: chave, pedidos: 0, faturamento: 0 };
      }

      acc[chave].pedidos++;
      acc[chave].faturamento += Number(
        (p.total || p.valor || 0) - (p.taxa || 0)
      );

      return acc;
    }, {})
  );

  // Ticket médio por mês (sem taxa)
  const ticketMedioPorMes = Object.values(
    pedidos.reduce((acc, p) => {
      const d = new Date(p.created_at);
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();
      const chave = `${mes}/${ano}`;
      if (!acc[chave]) acc[chave] = { mes: chave, faturamento: 0, pedidos: 0 };
      acc[chave].faturamento += Number(
        (p.total || p.valor || 0) - (p.taxa || 0)
      );
      acc[chave].pedidos++;
      return acc;
    }, {})
  ).map((m) => ({
    mes: m.mes,
    ticketMedio: m.pedidos > 0 ? m.faturamento / m.pedidos : 0,
  }));

  // Produtos mais vendidos
  const produtosMaisVendidos = Object.values(
    pedidos.reduce((acc, p) => {
      const itens = Array.isArray(p.itens)
        ? p.itens
        : typeof p.itens === "string"
        ? p.itens.split(",").map((i) => i.trim())
        : [];
      itens.forEach((item) => {
        if (!acc[item]) acc[item] = { name: item, value: 0 };
        acc[item].value++;
      });
      return acc;
    }, {})
  );

  // Top 5 produtos do dia
  const topProdutos = Object.values(
    pedidos
      .filter((p) => p.created_at.split("T")[0] === dataSelecionada)
      .reduce((acc, p) => {
        const itens = Array.isArray(p.itens)
          ? p.itens
          : typeof p.itens === "string"
          ? p.itens.split(",").map((i) => i.trim())
          : [];
        itens.forEach((item) => {
          if (!acc[item]) acc[item] = { name: item, value: 0 };
          acc[item].value++;
        });
        return acc;
      }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Exportar CSV
  const exportarCSV = () => {
    const pedidosDoDia = pedidos.filter(
      (p) => p.created_at.split("T")[0] === dataSelecionada
    );

    const header = [
      "Pedido",
      "Valor (R$)",
      "Data",
      "Itens",
      "Taxa do entregador (R$)",
    ];
    const rows = pedidosDoDia.map((p) => [
      p.id,
      ((p.total || p.valor || 0) - (p.taxa || 0)).toFixed(2),
      formatarDataCurta(p.created_at),
      Array.isArray(p.itens) ? p.itens.join(", ") : p.itens,
      (p.taxa || 0).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `relatorio_${formatarDataSelecionada(dataSelecionada)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="bg-[#F5F5F5] w-screen min-h-screen flex flex-col">
      <Header />
      <section className="p-6 flex-1">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4">
          <h1 className="  text-3xl font-bold text-gray-800">
            Resumo do dia - {formatarDataSelecionada(dataSelecionada)}
          </h1>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="border rounded p-2 mt-2 md:mt-0"
          />
        </div>

        <button
          onClick={exportarCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
        >
          Exportar CSV
        </button>

        {loading ? (
          <p>Carregando relatórios...</p>
        ) : (
          <>
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <h2 className="text-sm text-gray-500">Pedidos</h2>
                <p className="text-2xl font-bold">{resumo.pedidosHoje}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <h2 className="text-sm text-gray-500">Faturamento</h2>
                <p className="text-2xl font-bold">
                  R$ {resumo.faturamentoHoje.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <h2 className="text-sm text-gray-500">Ticket médio</h2>
                <p className="text-2xl font-bold">
                  R$ {resumo.ticketMedio.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Pedidos por mês */}
              <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4">Pedidos por mês</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pedidosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border p-2 rounded shadow">
                            <div>Pedidos: {data.pedidos}</div>
                            <div>
                              Faturamento: R$ {data.faturamento.toFixed(2)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="pedidos" fill="#6b4f3a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Ticket médio por mês */}
              <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4">
                  Ticket médio por mês
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ticketMedioPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                    <Bar dataKey="ticketMedio" fill="#a67c52" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Produtos mais vendidos */}
              <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4">
                  Produtos mais vendidos
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={produtosMaisVendidos}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {produtosMaisVendidos.map((entry, index) => {
                        const isTop5 = topProdutos.find(
                          (p) => p.name === entry.name
                        );
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              isTop5
                                ? COLORS_TOP5[topProdutos.indexOf(isTop5)]
                                : COLORS[index % COLORS.length]
                            }
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* Ranking Top 5 abaixo do gráfico */}
                <div className="mt-4">
                  <h3 className="text-md font-semibold mb-2">
                    Top 5 produtos do dia
                  </h3>
                  {topProdutos.length === 0 ? (
                    <p>Nenhum produto vendido neste dia.</p>
                  ) : (
                    <ol className="list-decimal list-inside">
                      {topProdutos.map((produto, index) => (
                        <li
                          key={index}
                          className="mb-1"
                          style={{ color: COLORS_TOP5[index] }}
                        >
                          {produto.name} - {produto.value} vendas
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}

export default Relatorios;
