import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../src/supabaseClient";

export default function HandleRecoveryLink() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash; // #access_token=...
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (access_token && refresh_token && type === "recovery") {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            console.error("Erro ao setar sessão:", error);
            // redireciona pra login se falhar
            navigate("/login");
          } else {
            // sessão OK → vai pro new-password
            navigate("/new-password");
          }
        });
    }
  }, [navigate]);

  return <p>🔑 Redirecionando para redefinição de senha...</p>;
}
