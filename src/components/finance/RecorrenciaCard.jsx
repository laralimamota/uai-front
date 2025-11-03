"use client";

import { formatCurrency, formatDate, normalizeStatus } from "@/utils/formatters";

export default function RecorrenciaCard({ data, onPayClick }) {
  const status = normalizeStatus(data?.status ?? data?.situacao ?? data?.state);
  const isPaid = status === "pago";
  const value = formatCurrency(
    data?.valor ?? data?.valorMensal ?? data?.valorBase ?? data?.amount ?? 0,
  );
  const dueDate = formatDate(data?.dataVencimento ?? data?.vencimento ?? data?.competencia);

  return (
    <article className={`finance-card${isPaid ? " finance-card--paid" : ""}`}>
      <div className="finance-card__main">
        <header className="finance-card__header">
          <h3 className="finance-card__title">{data?.nome ?? data?.descricao ?? "Recorrência"}</h3>
          <span className={`finance-card__status badge${isPaid ? " bg-success-subtle" : " bg-warning-subtle"}`}>
            {isPaid ? "Pago" : "Pendente"}
          </span>
        </header>
        <p className="finance-card__subtitle text-muted mb-2">
          Categoria: {data?.categoria ?? data?.categoriaNome ?? "Não informada"}
        </p>
        {data?.descricao ? (
          <p className="finance-card__subtitle text-muted mb-2 small">{data.descricao}</p>
        ) : null}
        <div className="finance-card__meta">
          <span>Valor: <strong>{value}</strong></span>
          <span>Vencimento: <strong>{dueDate}</strong></span>
        </div>
      </div>
      <div className="finance-card__actions">
        <div className="form-check form-switch">
          <input
            className="form-check-input finance-card__switch"
            type="checkbox"
            role="switch"
            id={`recorrencia-${data?.id ?? data?.transacaoId ?? "desconhecido"}`}
            checked={isPaid}
            onChange={() => onPayClick?.(data, isPaid)}
          />
          <label className="form-check-label" htmlFor={`recorrencia-${data?.id ?? data?.transacaoId ?? "desconhecido"}`}>
            Marcar pagamento
          </label>
        </div>
      </div>
    </article>
  );
}
