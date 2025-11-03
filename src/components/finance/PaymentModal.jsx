"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import ContaSelect from "@/components/finance/ContaSelect";
import { formatCurrency, formatDate, getTodayISO, normalizeStatus } from "@/utils/formatters";

export default function PaymentModal({
  isOpen,
  onClose,
  transaction,
  onConfirm,
  isSubmitting = false,
  usuarioId,
  errorMessage = "",
}) {
  const [confirmPayment, setConfirmPayment] = useState(true);
  const [contaId, setContaId] = useState(null);
  const [paymentDate, setPaymentDate] = useState(getTodayISO());

  useEffect(() => {
    if (!isOpen) return;
    const defaultAccount =
      transaction?.contaPadraoId ??
      transaction?.contaId ??
      transaction?.conta?.id ??
      transaction?.conta?.contaId ??
      null;
    startTransition(() => {
      setConfirmPayment(true);
      setContaId(defaultAccount ?? null);
      setPaymentDate(getTodayISO());
    });
  }, [isOpen, transaction]);

  const formattedValue = useMemo(
    () => formatCurrency(transaction?.valor ?? transaction?.valorParcela ?? transaction?.amount ?? 0),
    [transaction],
  );

  const dueDate = useMemo(
    () => formatDate(transaction?.dataVencimento ?? transaction?.vencimento ?? transaction?.competencia),
    [transaction],
  );

  const status = normalizeStatus(transaction?.status ?? transaction?.situacao);
  const isAlreadyPaid = status === "pago";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!confirmPayment || !contaId || !paymentDate || isSubmitting) {
      return;
    }
    onConfirm?.({
      contaId,
      dataPagamento: paymentDate,
    });
  };

  if (!isOpen || !transaction) {
    return null;
  }

  return (
    <div className="payment-modal" role="dialog" aria-modal="true">
      <div className="payment-modal__backdrop" onClick={isSubmitting ? undefined : onClose} />
      <div className="payment-modal__content">
        <header className="payment-modal__header">
          <h2 className="h5 mb-0">Confirmar pagamento</h2>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} disabled={isSubmitting} />
        </header>

        <form onSubmit={handleSubmit}>
          <section className="payment-modal__section">
            <h3 className="payment-modal__section-title">Resumo da pendência</h3>
            <ul className="payment-modal__summary list-unstyled mb-0">
              <li>
                <span>Descrição</span>
                <strong>{transaction?.descricao ?? transaction?.nome ?? "Transação"}</strong>
              </li>
              <li>
                <span>Valor</span>
                <strong>{formattedValue}</strong>
              </li>
              <li>
                <span>Vencimento</span>
                <strong>{dueDate}</strong>
              </li>
              <li>
                <span>Status atual</span>
                <strong className={isAlreadyPaid ? "text-success" : "text-warning"}>
                  {isAlreadyPaid ? "Pago" : "Pendente"}
                </strong>
              </li>
            </ul>
          </section>

          <section className="payment-modal__section">
            <h3 className="payment-modal__section-title">Detalhes do pagamento</h3>
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="confirmPaymentSwitch"
                checked={confirmPayment}
                onChange={(event) => setConfirmPayment(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="confirmPaymentSwitch">
                Pagamento realizado neste mês
              </label>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="paymentAccount">
                Conta usada
              </label>
              <ContaSelect
                usuarioId={usuarioId}
                value={contaId ?? ""}
                onChange={(nextValue) => setContaId(nextValue)}
                disabled={!confirmPayment}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="paymentDate">
                Data do pagamento
              </label>
              <input
                id="paymentDate"
                type="date"
                className="form-control"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                max={getTodayISO()}
                disabled={!confirmPayment}
                required
              />
            </div>
          </section>

          {errorMessage ? (
            <div className="alert alert-danger py-2" role="alert">
              {errorMessage}
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
              disabled={!confirmPayment || !contaId || !paymentDate || isSubmitting}
            >
              {isSubmitting ? "Registrando..." : "Confirmar pagamento"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
