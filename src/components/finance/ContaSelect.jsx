"use client";

import { useEffect, useState } from "react";
import { accountsApi } from "@/api/api";

export default function ContaSelect({ usuarioId, value, onChange, disabled }) {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuarioId) {
      setAccounts([]);
      return;
    }

    const controller = new AbortController();
    const fetchAccounts = async () => {
      try {
        setIsLoading(true);
        const response = await accountsApi.list(
          { usuarioId },
          { signal: controller.signal },
        );
        const payload = response?.data;
        const normalized = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
        setAccounts(normalized);
        setError("");
      } catch (requestError) {
        if (requestError?.code === "ERR_CANCELED" || controller.signal.aborted) {
          return;
        }
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.erro ||
          "Não foi possível carregar suas contas.";
        setError(message);
        setAccounts([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchAccounts();
    return () => controller.abort();
  }, [usuarioId]);

  return (
    <div className="conta-select">
      <select
        className="form-select"
        value={value ?? ""}
        onChange={(event) => onChange?.(event.target.value || null)}
        disabled={disabled || isLoading || !accounts.length}
      >
        <option value="">Selecione uma conta</option>
        {accounts.map((account) => (
          <option key={account.id ?? account.contaId} value={account.id ?? account.contaId}>
            {account.nome ?? account.description ?? "Conta"} — {account.tipo ?? account.tipoConta ?? "Tipo"}
          </option>
        ))}
      </select>
      {isLoading ? <div className="form-text">Carregando contas...</div> : null}
      {error ? <div className="text-danger small mt-1">{error}</div> : null}
    </div>
  );
}
