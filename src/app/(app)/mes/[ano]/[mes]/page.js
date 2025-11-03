"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import api from "@/api/api";
import useCompetencia from "@/hooks/useCompetencia";
import useTransacoes from "@/hooks/useTransacoes";
import MonthSelector from "@/components/finance/MonthSelector";
import RecorrenciaCard from "@/components/finance/RecorrenciaCard";
import ParcelamentoCard from "@/components/finance/ParcelamentoCard";
import PaymentModal from "@/components/finance/PaymentModal";
import { formatCurrency } from "@/utils/formatters";

function extractTransactionId(transaction) {
  return transaction?.id ?? transaction?.transacaoId ?? transaction?.transactionId ?? null;
}

function splitTransactions(transactions = []) {
  const recorrencias = [];
  const parcelamentos = [];

  transactions.forEach((transaction) => {
    const hasRecurrence =
      transaction?.recorrenciaId ||
      transaction?.tipo === "RECORRENCIA" ||
      String(transaction?.origem ?? "").toLowerCase().includes("recorr");

    const hasInstallment =
      transaction?.parcelamentoId ||
      transaction?.tipo === "PARCELAMENTO" ||
      String(transaction?.origem ?? "").toLowerCase().includes("parcel");

    if (hasInstallment) {
      parcelamentos.push(transaction);
    } else if (hasRecurrence) {
      recorrencias.push(transaction);
    } else {
      // fallback: treat as recurrence to ensure visibility
      recorrencias.push(transaction);
    }
  });

  return { recorrencias, parcelamentos };
}

export default function MonthlySummaryPage({ params }) {
  const router = useRouter();
  const initialCompetencia = useMemo(() => {
    const year = params?.ano;
    const month = params?.mes;
    if (!year || !month) {
      return dayjs().format("YYYY-MM");
    }
    const normalized = dayjs(`${year}-${month}-01`);
    if (!normalized.isValid()) {
      return dayjs().format("YYYY-MM");
    }
    return normalized.format("YYYY-MM");
  }, [params?.ano, params?.mes]);

  const { competencia, goToNextMonth, goToPreviousMonth, competenciaDate } =
    useCompetencia(initialCompetencia);

  useEffect(() => {
    const expectedPath = `/mes/${competenciaDate.format("YYYY")}/${competenciaDate.format("MM")}`;
    if (typeof window !== "undefined" && window.location.pathname === expectedPath) {
      return;
    }
    router.replace(expectedPath);
  }, [competenciaDate, router]);

  const [usuarioId, setUsuarioId] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedUser = window.localStorage.getItem("uai:user");
    if (!storedUser) {
      router.replace("/");
      return;
    }
    try {
      const parsed = JSON.parse(storedUser);
      const candidates = [
        parsed?.id,
        parsed?.userId,
        parsed?.usuarioId,
        parsed?.usuario?.id,
        parsed?.usuario?.usuarioId,
      ]
        .filter((candidate) => candidate !== null && candidate !== undefined)
        .map((candidate) => Number(candidate));
      const validId = candidates.find((value) => Number.isFinite(value) && value > 0);
      if (!validId) {
        router.replace("/");
        return;
      }
      startTransition(() => {
        setUsuarioId(validId);
      });
    } catch (error) {
      router.replace("/");
    }
  }, [router]);

  const {
    data: transactions,
    isLoading,
    error,
    refresh,
  } = useTransacoes({ competencia, usuarioId });

  const { recorrencias, parcelamentos } = useMemo(
    () => splitTransactions(transactions),
    [transactions],
  );

  const totals = useMemo(() => {
    const sumValues = (items = []) =>
      items.reduce((total, item) => {
        const value = Number(item?.valor ?? item?.valorParcela ?? item?.amount ?? 0);
        if (!Number.isFinite(value)) {
          return total;
        }
        return total + value;
      }, 0);

    return {
      recorrencias: sumValues(recorrencias),
      parcelamentos: sumValues(parcelamentos),
    };
  }, [parcelamentos, recorrencias]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestPayment = (transaction, isPaid) => {
    if (!transaction || isPaid) {
      return;
    }
    setSelectedTransaction(transaction);
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
    setIsSubmitting(false);
    setModalError("");
  };

  const handleConfirmPayment = async ({ contaId, dataPagamento }) => {
    const transactionId = extractTransactionId(selectedTransaction);
    if (!transactionId) {
      setModalError("Transação selecionada não possui identificador.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/transacoes/${transactionId}/pagar`, {
        contaId,
        dataPagamento,
      });
      closeModal();
      refresh();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.erro ||
        "Não foi possível registrar o pagamento. Tente novamente.";
      setModalError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="monthly-summary container py-4 py-lg-5">
      <header className="monthly-summary__header mb-4">
        <MonthSelector
          competencia={competencia}
          onPrevious={() => {
            goToPreviousMonth();
          }}
          onNext={() => {
            goToNextMonth();
          }}
        />
        <div className="monthly-summary__totals">
          <div className="monthly-summary__total-card">
            <span className="monthly-summary__total-label">Recorrências do mês</span>
            <strong className="monthly-summary__total-value">
              {formatCurrency(totals.recorrencias)}
            </strong>
          </div>
          <div className="monthly-summary__total-card">
            <span className="monthly-summary__total-label">Parcelamentos do mês</span>
            <strong className="monthly-summary__total-value">
              {formatCurrency(totals.parcelamentos)}
            </strong>
          </div>
        </div>
      </header>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="monthly-summary__loader">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Carregando transações do mês...
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="row g-4">
          <div className="col-12 col-xl-6">
            <section className="panel-card h-100">
              <header className="panel-card__header d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h2 className="panel-card__title h5 mb-1">Recorrências</h2>
                  <p className="panel-card__subtitle text-muted mb-0">
                    Pagamentos automáticos previstos para este mês.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => refresh()}
                >
                  Atualizar
                </button>
              </header>

              {recorrencias.length ? (
                <div className="finance-card__grid">
                  {recorrencias.map((recorrencia, index) => (
                    <RecorrenciaCard
                      key={
                        extractTransactionId(recorrencia) ??
                        `${recorrencia?.nome ?? recorrencia?.descricao ?? "recorrencia"}-${recorrencia?.competencia ?? index}`
                      }
                      data={recorrencia}
                      onPayClick={handleRequestPayment}
                    />
                  ))}
                </div>
              ) : (
                <div className="monthly-summary__empty">
                  <h3 className="monthly-summary__empty-title h5">Sem recorrências neste mês</h3>
                  <p className="monthly-summary__empty-description text-muted mb-0">
                    Cadastre novas recorrências para acompanhar aqui.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="col-12 col-xl-6">
            <section className="panel-card h-100">
              <header className="panel-card__header d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h2 className="panel-card__title h5 mb-1">Parcelamentos</h2>
                  <p className="panel-card__subtitle text-muted mb-0">
                    Parcelas que vencem na competência selecionada.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={() => refresh()}
                >
                  Atualizar
                </button>
              </header>

              {parcelamentos.length ? (
                <div className="finance-card__grid">
                  {parcelamentos.map((parcela, index) => (
                    <ParcelamentoCard
                      key={
                        extractTransactionId(parcela) ??
                        `${parcela?.descricao ?? parcela?.nome ?? "parcela"}-${parcela?.competencia ?? index}`
                      }
                      data={parcela}
                      onPayClick={handleRequestPayment}
                    />
                  ))}
                </div>
              ) : (
                <div className="monthly-summary__empty">
                  <h3 className="monthly-summary__empty-title h5">Sem parcelamentos neste mês</h3>
                  <p className="monthly-summary__empty-description text-muted mb-0">
                    Cadastre parcelamentos ou gere novas parcelas para visualizar aqui.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      <PaymentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        transaction={selectedTransaction}
        usuarioId={usuarioId}
        onConfirm={handleConfirmPayment}
        isSubmitting={isSubmitting}
        errorMessage={modalError}
      />
    </section>
  );
}
