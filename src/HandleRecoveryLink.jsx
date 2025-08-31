import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HandleRecoveryLink() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash; // #access_token=...
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      // Redireciona para NewPassword com query param
      navigate(`/new-password?access_token=${token}`);
    }
  }, [navigate]);

  return <p>Redirecionando...</p>;
}
