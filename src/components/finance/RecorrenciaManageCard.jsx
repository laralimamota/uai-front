"use client";

import { formatCurrency, formatDate } from "@/utils/formatters";

export default function RecorrenciaManageCard({ data, onEdit, onDelete, onGenerate }) {
  const value = formatCurrency(data?.valorMensal ?? data?.valor ?? data?.valorBase ?? data?.amount ?? 0);
  const day = data?.diaVencimento ?? data?.dia ?? data?.diaCobranca ?? "-";
  const statusText = String(data?.status ?? "").toUpperCase();
  const isActive = Boolean(
    data?.ativo ?? data?.ativa ?? (statusText ? statusText.includes("ATIV") : undefined) ?? true,
  );
  const startDate = data?.inicio ?? data?.dataInicio ?? null;

  return (
    <article className="recorrencia-card panel-card panel-card--plain">
      <header className="recorrencia-card__header">
        <div>
          <h3 className="recorrencia-card__title h5 mb-1">
            {data?.nome ?? data?.descricao ?? "Recorrência"}
          </h3>
          <p className="recorrencia-card__subtitle text-muted mb-0">
            Categoria: {data?.categoria ?? data?.categoriaNome ?? "Não informada"}
          </p>
          {data?.descricao ? (
            <p className="recorrencia-card__description text-muted mb-0 small">{data.descricao}</p>
          ) : null}
        </div>
        <span className={`badge recorrencia-card__status${isActive ? " bg-success-subtle" : " bg-secondary-subtle"}`}>
          {isActive ? "Ativa" : "Inativa"}
        </span>
      </header>

      <div className="recorrencia-card__meta">
        <span>
          Valor mensal: <strong>{value}</strong>
        </span>
        <span>
          Dia da cobrança: <strong>{day}</strong>
        </span>
        {startDate ? (
          <span>
            Início: <strong>{formatDate(startDate)}</strong>
          </span>
        ) : null}
        {data?.fim ? (
          <span>
            Fim: <strong>{formatDate(data.fim)}</strong>
          </span>
        ) : null}
        <span>
          Conta padrão:{" "}
          <strong>{data?.contaPadrao?.nome ?? data?.contaPadraoNome ?? "Não definida"}</strong>
        </span>
      </div>

      <div className="recorrencia-card__actions">
        <button
          type="button"
          className="btn btn-outline-light btn-sm"
          onClick={() => onGenerate?.(data)}
        >
          Gerar transações
        </button>
        <div className="recorrencia-card__actions-group">
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none"
            onClick={() => onEdit?.(data)}
          >
            Editar
          </button>
          <button
            type="button"
            className="btn btn-link btn-sm text-danger text-decoration-none"
            onClick={() => onDelete?.(data)}
          >
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
}
