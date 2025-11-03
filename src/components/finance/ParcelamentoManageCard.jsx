"use client";

import { formatCurrency, formatDate } from "@/utils/formatters";

export default function ParcelamentoManageCard({ data, onEdit, onDelete, onRegisterPayment }) {
  const totalValue = formatCurrency(data?.valorTotal ?? data?.valor ?? data?.amount ?? 0);
  const installmentsCount =
    data?.quantidadeParcelas ?? data?.qtdParcelas ?? data?.totalParcelas ?? data?.parcelas ?? 0;
  const paidCount = data?.parcelasPagas ?? data?.pagas ?? data?.parcelasQuitadas ?? 0;
  const remaining = Math.max(0, Number(installmentsCount) - Number(paidCount));
  const firstDueDate = formatDate(data?.inicio ?? data?.dataPrimeiraParcela ?? data?.dataInicio ?? data?.criadoEm);
  const endDate = data?.fim ?? data?.dataFim ?? null;

  const statusLabel = remaining > 0 ? `${remaining} parcelas restantes` : "Parcelamento quitado";

  return (
    <article className="parcelamento-card panel-card panel-card--plain">
      <header className="parcelamento-card__header">
        <div>
          <h3 className="parcelamento-card__title h5 mb-1">
            {data?.nome ?? data?.descricao ?? "Parcelamento"}
          </h3>
          <p className="parcelamento-card__subtitle text-muted mb-0">
            Categoria: {data?.categoria ?? data?.categoriaNome ?? "Não informada"}
          </p>
          {data?.descricao ? (
            <p className="text-muted small mb-0">{data.descricao}</p>
          ) : null}
        </div>
        <span className={`badge parcelamento-card__status${remaining > 0 ? " bg-warning-subtle" : " bg-success-subtle"}`}>
          {statusLabel}
        </span>
      </header>

      <div className="parcelamento-card__meta">
        <span>Total: <strong>{totalValue}</strong></span>
        <span>Parcelas: <strong>{installmentsCount}</strong></span>
        <span>Pagas: <strong>{paidCount}</strong></span>
        <span>Início: <strong>{firstDueDate}</strong></span>
        {endDate ? (
          <span>
            Fim: <strong>{formatDate(endDate)}</strong>
          </span>
        ) : null}
        <span>Conta padrão: <strong>{data?.contaPadrao?.nome ?? data?.contaPadraoNome ?? "Não definida"}</strong></span>
      </div>

      <div className="parcelamento-card__actions">
        <button
          type="button"
          className="btn btn-outline-light btn-sm"
          onClick={() => onRegisterPayment?.(data)}
          disabled={remaining <= 0}
        >
          Registrar pagamento
        </button>
        <div className="parcelamento-card__actions-group">
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
