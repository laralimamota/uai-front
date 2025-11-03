"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/api/api";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function normalizeTransactions(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function calculateSummary(transactions) {
  return transactions.reduce(
    (accumulator, transaction) => {
      const amount = Number(transaction?.valor ?? transaction?.value ?? transaction?.amount ?? 0);
      if (!Number.isFinite(amount)) {
        return accumulator;
      }

      const kind = String(transaction?.tipo ?? transaction?.type ?? "");
      const isIncome =
        kind.toUpperCase().includes("RECEITA") ||
        kind.toUpperCase().includes("INCOME") ||
        (!kind && amount >= 0);

      if (isIncome) {
        const absolute = Math.abs(amount);
        accumulator.income += absolute;
        accumulator.balance += absolute;
      } else {
        const absolute = Math.abs(amount);
        accumulator.expense += absolute;
        accumulator.balance -= absolute;
      }

      return accumulator;
    },
    { balance: 0, income: 0, expense: 0 },
  );
}

function formatCurrency(value) {
  return currencyFormatter.format(value ?? 0);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedUser = window.localStorage.getItem("uai:user");
    if (!storedUser) {
      router.replace("/");
      return;
    }

    const controller = new AbortController();

    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/transacoes", { signal: controller.signal });
        const list = normalizeTransactions(response.data);
        setTransactions(list);
        setError("");
      } catch (requestError) {
        if (controller.signal.aborted) return;
        const message =
          requestError.response?.data?.message ||
          requestError.response?.data?.erro ||
          "Não foi possível carregar as transações. Tente novamente em instantes.";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();
    return () => controller.abort();
  }, [router]);

  const latestTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  return (
    <section className="dashboard container py-4 py-lg-5">
      <header className="dashboard__header d-flex flex-column flex-lg-row align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill dashboard__badge text-uppercase">Visão geral</span>
          <h1 className="dashboard__title display-6 fw-semibold mt-2 mb-0">Dashboard financeiro</h1>
          <p className="dashboard__subtitle text-muted mb-0">
            Acompanhe seu fluxo de caixa, evolução das contas e os últimos movimentos.
          </p>
        </div>
        <div className="ms-lg-auto d-flex gap-2">
          <Link className="btn btn-primary px-4" href="/transacoes">
            Nova transação
          </Link>
          <Link className="btn btn-outline-light px-4 dashboard__ghost-btn" href="/contas">
            Gerenciar contas
          </Link>
        </div>
      </header>

      <div className="dashboard-grid mb-4">
        <article className="info-card gradient-card gradient-card--primary">
          <header className="info-card__header">
            <span className="info-card__label">Saldo atual</span>
          </header>
          <div className="info-card__value">{formatCurrency(summary.balance)}</div>
          <p className="info-card__description">
            Resultado consolidado entre receitas e despesas registradas.
          </p>
        </article>

        <article className="info-card gradient-card gradient-card--success">
          <header className="info-card__header">
            <span className="info-card__label">Receitas</span>
          </header>
          <div className="info-card__value">{formatCurrency(summary.income)}</div>
          <p className="info-card__description">
            Total de entradas identificadas nos lançamentos mais recentes.
          </p>
        </article>

        <article className="info-card gradient-card gradient-card--danger">
          <header className="info-card__header">
            <span className="info-card__label">Despesas</span>
          </header>
          <div className="info-card__value">{formatCurrency(summary.expense)}</div>
          <p className="info-card__description">
            Valor acumulado das saídas que impactam seu fluxo de caixa.
          </p>
        </article>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <section className="panel-card h-100">
            <header className="panel-card__header d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="panel-card__title h5 mb-1">Últimas transações</h2>
                <p className="panel-card__subtitle text-muted mb-0">
                  Monitoramento rápido dos lançamentos adicionados recentemente.
                </p>
              </div>
              <Link className="panel-card__action text-decoration-none" href="/transacoes">
                Ver todas
              </Link>
            </header>

            {error ? (
              <div className="alert alert-danger auth-alert mb-0" role="alert">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="dashboard__loader">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Carregando transações...
              </div>
            ) : null}

            {!isLoading && !error ? (
              latestTransactions.length ? (
                <ul className="list-unstyled dashboard__transactions">
                  {latestTransactions.map((transaction) => {
                    const rawAmount = Number(
                      transaction?.valor ?? transaction?.value ?? transaction?.amount ?? 0,
                    );
                    const normalizedAmount = Number.isFinite(rawAmount) ? rawAmount : 0;
                    const isNegative =
                      !(String(transaction?.tipo ?? transaction?.type ?? "")
                        .toUpperCase()
                        .includes("RECEITA") ||
                      normalizedAmount >= 0);
                    const formattedAmount = formatCurrency(Math.abs(normalizedAmount));

                    return (
                      <li key={transaction.id ?? `${transaction?.descricao}-${transaction?.data}`} className="dashboard__transaction">
                        <div className="dashboard__transaction-info">
                          <h3 className="dashboard__transaction-title">
                            {transaction?.descricao ?? transaction?.description ?? "Transação"}
                          </h3>
                          <span className="dashboard__transaction-date">
                            {formatDate(transaction?.data ?? transaction?.dataTransacao ?? transaction?.createdAt)}
                          </span>
                        </div>
                        <div className={`dashboard__transaction-amount${isNegative ? " is-negative" : " is-positive"}`}>
                          {isNegative ? "-" : "+"}
                          {formattedAmount}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="dashboard__empty">
                  <h3 className="dashboard__empty-title">Nenhuma transação registrada ainda</h3>
                  <p className="dashboard__empty-text">
                    Cadastre sua primeira movimentação para visualizar o resumo financeiro.
                  </p>
                  <Link className="btn btn-primary px-4" href="/transacoes">
                    Registrar transação
                  </Link>
                </div>
              )
            ) : null}
          </section>
        </div>

        <div className="col-12 col-xl-5">
          <section className="panel-card h-100">
            <header className="panel-card__header mb-3">
              <h2 className="panel-card__title h5 mb-1">Próximos passos</h2>
              <p className="panel-card__subtitle text-muted mb-0">
                Acelere sua organização financeira com estes atalhos.
              </p>
            </header>

            <ul className="dashboard__actions list-unstyled mb-0">
              <li className="dashboard__action-item">
                <div>
                  <h3 className="dashboard__action-title mb-1">Cadastrar conta bancária</h3>
                  <p className="dashboard__action-text text-muted mb-0">
                    Registre suas contas para concentrar investimentos, cartões e aplicações.
                  </p>
                </div>
                <Link className="btn btn-sm btn-outline-light dashboard__ghost-btn" href="/contas">
                  Ir para contas
                </Link>
              </li>
              <li className="dashboard__action-item">
                <div>
                  <h3 className="dashboard__action-title mb-1">Planejar transações futuras</h3>
                  <p className="dashboard__action-text text-muted mb-0">
                    Defina lembretes de lançamentos recorrentes e não perca vencimentos.
                  </p>
                </div>
                <Link className="btn btn-sm btn-outline-light dashboard__ghost-btn" href="/transacoes">
                  Ver transações
                </Link>
              </li>
              <li className="dashboard__action-item">
                <div>
                  <h3 className="dashboard__action-title mb-1">Explorar insights</h3>
                  <p className="dashboard__action-text text-muted mb-0">
                    Compare períodos, identifique gastos relevantes e encontre oportunidades.
                  </p>
                </div>
                <Link className="btn btn-sm btn-outline-light dashboard__ghost-btn" href="/dashboard/insights">
                  Explorar insights
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
