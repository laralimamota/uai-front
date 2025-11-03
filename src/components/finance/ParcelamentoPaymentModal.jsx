"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { installmentsApi } from "@/api/api";
import { formatCurrency, formatDate, getTodayISO, normalizeStatus } from "@/utils/formatters";
import ContaSelect from "@/components/finance/ContaSelect";

export default function ParcelamentoPaymentModal({
  parcelamento,
  isOpen,
  onClose,
  usuarioId,
  onPaymentRegistered,
}) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [contaId, setContaId] = useState(null);
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !parcelamento) {
      return;
    }

    const parcelamentoId = parcelamento?.id ?? parcelamento?.parcelamentoId;
    if (!parcelamentoId) {
      return;
    }

    const controller = new AbortController();
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const response = await installmentsApi.listTransactions(parcelamentoId, {}, {
          signal: controller.signal,
        });
        const payload = response?.data;
        const normalized = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
        startTransition(() => {
          setTransactions(normalized);
          setError("");
          const pendingTransaction = normalized.find((transaction) => normalizeStatus(transaction?.status) !== "pago");
          setSelectedTransactionId(pendingTransaction?.id ?? pendingTransaction?.transacaoId ?? null);
        });
      } catch (requestError) {
        if (controller.signal.aborted) return;
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.erro ||
          "Não foi possível carregar as parcelas deste parcelamento.";
        startTransition(() => {
          setError(message);
          setTransactions([]);
          setSelectedTransactionId(null);
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();
    return () => controller.abort();
  }, [isOpen, parcelamento]);

  useEffect(() => {
    if (!isOpen) return;
    startTransition(() => {
      setContaId(
        parcelamento?.contaPadraoId ??
          parcelamento?.contaPadrao?.id ??
          parcelamento?.contaPadrao?.contaId ??
          null,
      );
      setPaymentDate(getTodayISO());
      setIsSubmitting(false);
      setError("");
    });
  }, [isOpen, parcelamento]);

  const pendingTransactions = useMemo(() => {
    return transactions.filter((transaction) => normalizeStatus(transaction?.status) !== "pago");
  }, [transactions]);

  const selectedTransaction = useMemo(() => {
    return transactions.find((transaction) => {
      const transactionId = transaction?.id ?? transaction?.transacaoId;
      return transactionId === selectedTransactionId;
    }) ?? null;
  }, [selectedTransactionId, transactions]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!parcelamento || !selectedTransaction || !contaId || !paymentDate) {
      return;
    }

    const parcelamentoId = parcelamento?.id ?? parcelamento?.parcelamentoId;
    const transactionId = selectedTransaction?.id ?? selectedTransaction?.transacaoId;
    if (!parcelamentoId || !transactionId) {
      setError("Não foi possível identificar a parcela selecionada.");
      return;
    }

    const contaNumeric = Number(contaId);
    if (!Number.isFinite(contaNumeric)) {
      setError("Selecione uma conta válida para registrar o pagamento.");
      return;
    }

    try {
      setIsSubmitting(true);
      await installmentsApi.registerPayment(parcelamentoId, {
        transacaoId: transactionId,
        contaId: contaNumeric,
        dataPagamento: paymentDate,
      });
      onPaymentRegistered?.();
      onClose?.();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.erro ||
        "Não foi possível registrar o pagamento desta parcela.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !parcelamento) {
    return null;
  }

  return (
    <div className="payment-modal" role="dialog" aria-modal="true">
      <div className="payment-modal__backdrop" onClick={isSubmitting ? undefined : onClose} />
      <div className="payment-modal__content">
        <header className="payment-modal__header">
          <h2 className="h5 mb-0">Registrar pagamento de parcela</h2>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} disabled={isSubmitting} />
        </header>

        <form onSubmit={handleSubmit}>
          <section className="payment-modal__section">
            <h3 className="payment-modal__section-title">Parcelamento</h3>
            <ul className="payment-modal__summary list-unstyled mb-0">
              <li>
                <span>Nome</span>
                <strong>{parcelamento?.nome ?? parcelamento?.descricao ?? "Parcelamento"}</strong>
              </li>
              {parcelamento?.descricao ? (
                <li>
                  <span>Descrição</span>
                  <strong>{parcelamento.descricao}</strong>
                </li>
              ) : null}
              <li>
                <span>Total</span>
                <strong>{formatCurrency(parcelamento?.valorTotal ?? parcelamento?.valor ?? 0)}</strong>
              </li>
              <li>
                <span>Parcelas pagas</span>
                <strong>
                  {(parcelamento?.parcelasPagas ?? parcelamento?.pagas ?? 0)} / {(parcelamento?.quantidadeParcelas ?? parcelamento?.qtdParcelas ?? parcelamento?.totalParcelas ?? 0)}
                </strong>
              </li>
              <li>
                <span>Início</span>
                <strong>{formatDate(parcelamento?.inicio ?? parcelamento?.dataPrimeiraParcela)}</strong>
              </li>
            </ul>
          </section>

          <section className="payment-modal__section">
            <h3 className="payment-modal__section-title">Selecionar parcela</h3>

            {isLoading ? (
              <div className="payment-modal__summary">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Carregando parcelas...
              </div>
            ) : null}

            {!isLoading && !pendingTransactions.length ? (
              <div className="alert alert-info py-2" role="alert">
                Todas as parcelas deste parcelamento já foram pagas.
              </div>
            ) : null}

            {pendingTransactions.length ? (
              <div className="mb-3">
                <label className="form-label" htmlFor="parcelamentoTransacao">
                  Escolha a parcela a registrar
                </label>
                <select
                  id="parcelamentoTransacao"
                  className="form-select"
                  value={selectedTransactionId ?? ""}
                  onChange={(event) => setSelectedTransactionId(event.target.value ? Number(event.target.value) : null)}
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Selecione uma parcela</option>
                  {pendingTransactions.map((transaction) => {
                    const transactionId = transaction?.id ?? transaction?.transacaoId;
                    const competence = transaction?.competencia ?? dayjs(transaction?.dataVencimento ?? transaction?.createdAt).format("YYYY-MM");
                    const amount = formatCurrency(transaction?.valor ?? transaction?.amount ?? 0);
                    return (
                      <option key={transactionId} value={transactionId}>
                        {competence} — {amount}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : null}

            <div className="mb-3">
              <label className="form-label" htmlFor="parcelamentoConta">
                Conta usada
              </label>
              <ContaSelect
                usuarioId={usuarioId}
                value={contaId ?? ""}
                onChange={(nextValue) => setContaId(nextValue)}
                disabled={isSubmitting || !pendingTransactions.length}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="parcelamentoData">
                Data do pagamento
              </label>
              <input
                id="parcelamentoData"
                type="date"
                className="form-control"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                max={getTodayISO()}
                disabled={isSubmitting || !pendingTransactions.length}
                required
              />
            </div>
          </section>

          {error ? (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          ) : null}

          <footer className="payment-modal__footer">
            <button
              type="button"
              className="btn btn-outline-light"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                isSubmitting ||
                !selectedTransactionId ||
                !contaId ||
                !paymentDate ||
                !pendingTransactions.length
              }
            >
              {isSubmitting ? "Registrando..." : "Confirmar pagamento"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
