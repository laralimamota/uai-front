"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { accountsApi } from "@/api/api";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const accountTypeSuggestions = [
  "Conta corrente",
  "Conta poupança",
  "Cartão de crédito",
  "Carteira digital",
  "Investimentos",
  "Dinheiro",
];

function normalizeAccounts(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function extractUserId(rawUser) {
  if (!rawUser) return null;
  const possibleIds = [
    rawUser.id,
    rawUser.userId,
    rawUser.usuarioId,
    rawUser?.usuario?.id,
    rawUser?.usuario?.usuarioId,
  ];

  for (const candidate of possibleIds) {
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }
    const numericCandidate = Number(candidate);
    if (Number.isFinite(numericCandidate) && Number.isInteger(numericCandidate) && numericCandidate > 0) {
      return numericCandidate;
    }
  }

  return null;
}

function formatCurrency(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return currencyFormatter.format(0);
  return currencyFormatter.format(numericValue);
}

function parseSaldoInput(value) {
  if (typeof value === "number") {
    return value;
  }
  if (value === null || value === undefined) {
    return NaN;
  }
  const normalized = String(value)
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(normalized);
}

function validateForm(fields) {
  const errors = {};
  const trimmedName = fields.nome?.trim() ?? "";
  const trimmedType = fields.tipo?.trim() ?? "";
  const saldoNumber = parseSaldoInput(fields.saldo);

  if (!trimmedName) {
    errors.nome = "Informe o nome da conta.";
  } else if (trimmedName.length < 3) {
    errors.nome = "O nome deve ter pelo menos 3 caracteres.";
  }

  if (!trimmedType) {
    errors.tipo = "Descreva o tipo de conta.";
  }

  if (!Number.isFinite(saldoNumber) || saldoNumber < 0) {
    errors.saldo = "O saldo inicial deve ser um número positivo ou zero.";
  }

  return { errors, trimmedName, trimmedType, saldoNumber };
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  const [formState, setFormState] = useState({
    nome: "",
    tipo: "",
    saldo: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState({ type: "idle", message: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedUser = window.localStorage.getItem("uai:user");
    if (!storedUser) {
      router.replace("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      const resolvedUserId = extractUserId(parsedUser);
      if (!resolvedUserId) {
        setError("Não foi possível identificar o usuário autenticado.");
        setIsLoading(false);
        return;
      }
      setUserId(resolvedUserId);
    } catch (parseError) {
      setError("Ocorreu um problema ao carregar seus dados. Faça login novamente.");
      setIsLoading(false);
    }
  }, [router]);

  const fetchAccounts = useCallback(
    async ({ signal, displayFullLoader = false, silent = false } = {}) => {
      if (!userId) {
        return;
      }

      if (!silent) {
        if (displayFullLoader) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
      }

      try {
        const response = await accountsApi.list(
          { usuarioId: userId },
          { signal },
        );
        const list = normalizeAccounts(response.data);
        setAccounts(list);
        setError("");
      } catch (requestError) {
        if (
          signal?.aborted ||
          requestError?.name === "CanceledError" ||
          requestError?.code === "ERR_CANCELED"
        ) {
          return;
        }
        const message =
          requestError.response?.data?.message ||
          requestError.response?.data?.erro ||
          "Não foi possível carregar suas contas. Tente novamente em instantes.";
        setError(message);
      } finally {
        if (!silent) {
          if (displayFullLoader) {
            setIsLoading(false);
          } else {
            setIsRefreshing(false);
          }
        }
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    const controller = new AbortController();
    fetchAccounts({ signal: controller.signal, displayFullLoader: true });
    return () => controller.abort();
  }, [fetchAccounts, userId]);

  const summary = useMemo(() => {
    if (!accounts.length) {
      return { totalBalance: 0, count: 0 };
    }

    return accounts.reduce(
      (accumulator, account) => {
        const currentValue = Number(
          account?.saldo ?? account?.balance ?? account?.valor ?? account?.amount ?? 0,
        );
        if (Number.isFinite(currentValue)) {
          accumulator.totalBalance += currentValue;
        }
        accumulator.count += 1;
        return accumulator;
      },
      { totalBalance: 0, count: 0 },
    );
  }, [accounts]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }));
    setFormErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
    setSubmitFeedback({ type: "idle", message: "" });
  };

  const resetForm = () => {
    setFormState({
      nome: "",
      tipo: "",
      saldo: "",
    });
    setFormErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId) {
      setSubmitFeedback({
        type: "error",
        message: "Faça login novamente para registrar uma conta.",
      });
      return;
    }

    const { errors, trimmedName, trimmedType, saldoNumber } = validateForm(formState);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback({ type: "idle", message: "" });

    try {
      const payload = {
        nome: trimmedName,
        tipo: trimmedType,
        saldo: Number(saldoNumber.toFixed(2)),
        usuarioId: userId,
      };
      await accountsApi.create(payload);
      await fetchAccounts({ silent: true });

      resetForm();
      setSubmitFeedback({
        type: "success",
        message: "Conta cadastrada com sucesso!",
      });
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.erro ||
        "Não foi possível criar a conta. Verifique os dados e tente novamente.";
      setSubmitFeedback({
        type: "error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="accounts container py-4 py-lg-5">
      <header className="accounts__header d-flex flex-column flex-lg-row align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill accounts__badge text-uppercase">Contas</span>
          <h1 className="accounts__title display-6 fw-semibold mt-2 mb-0">
            Estruture de onde o dinheiro sai
          </h1>
          <p className="accounts__subtitle text-muted mb-0">
            Cadastre suas contas, defina o saldo inicial e acompanhe o impacto nas suas finanças.
          </p>
        </div>
        <div className="ms-lg-auto">
          <div className="accounts__summary card border-0">
            <div className="card-body py-3 px-4">
              <span className="accounts__summary-label text-uppercase">Saldo total</span>
              <h2 className="accounts__summary-value mb-0">
                {formatCurrency(summary.totalBalance)}
              </h2>
              <span className="accounts__summary-count text-muted">
                {summary.count} {summary.count === 1 ? "conta cadastrada" : "contas cadastradas"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <section className="panel-card h-100">
            <header className="panel-card__header mb-3">
              <h2 className="panel-card__title h5 mb-1">Nova conta</h2>
              <p className="panel-card__subtitle text-muted mb-0">
                Organize suas saídas cadastrando contas com saldo inicial real.
              </p>
            </header>

            <form className="accounts-form" noValidate onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="nome">
                  Nome da conta
                </label>
                <input
                  className={`form-control${formErrors.nome ? " is-invalid" : ""}`}
                  id="nome"
                  name="nome"
                  placeholder="Ex.: Conta corrente Itaú"
                  value={formState.nome}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.nome ? (
                  <div className="invalid-feedback">{formErrors.nome}</div>
                ) : null}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="tipo">
                  Tipo de conta
                </label>
                <input
                  className={`form-control${formErrors.tipo ? " is-invalid" : ""}`}
                  id="tipo"
                  name="tipo"
                  placeholder="Escolha ou descreva o tipo"
                  list="account-types"
                  value={formState.tipo}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                <datalist id="account-types">
                  {accountTypeSuggestions.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
                {formErrors.tipo ? (
                  <div className="invalid-feedback">{formErrors.tipo}</div>
                ) : null}
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold" htmlFor="saldo">
                  Saldo inicial
                </label>
                <div className="input-group">
                  <span className="input-group-text">R$</span>
                  <input
                    className={`form-control${formErrors.saldo ? " is-invalid" : ""}`}
                    id="saldo"
                    name="saldo"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={formState.saldo}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.saldo ? (
                    <div className="invalid-feedback d-block">{formErrors.saldo}</div>
                  ) : null}
                </div>
                <small className="text-muted">
                  Utilize vírgula para centavos, por exemplo: 1250,50
                </small>
              </div>

              {submitFeedback.message ? (
                <div
                  className={`alert ${
                    submitFeedback.type === "success" ? "alert-success" : "alert-danger"
                  } py-2`}
                  role="alert"
                >
                  {submitFeedback.message}
                </div>
              ) : null}

              <div className="d-grid">
                <button
                  className="btn btn-primary rounded-pill py-2"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvando..." : "Cadastrar conta"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="col-12 col-lg-7">
          <section className="panel-card h-100">
            <header className="panel-card__header d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="panel-card__title h5 mb-1">Suas contas</h2>
                <p className="panel-card__subtitle text-muted mb-0">
                  Controle os saldos para entender quanto está disponível para saídas.
                </p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-outline-light accounts__refresh"
                  type="button"
                  onClick={() => fetchAccounts()}
                  disabled={isLoading || isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Atualizando...
                    </>
                  ) : (
                    "Atualizar lista"
                  )}
                </button>
              </div>
            </header>

            {error ? (
              <div className="alert alert-danger mb-0" role="alert">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="accounts__loader">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Carregando contas...
              </div>
            ) : null}

            {!isLoading && !error ? (
              accounts.length ? (
                <ul className="list-unstyled accounts__list mb-0">
                  {accounts.map((account) => {
                    const accountName = account?.nome ?? account?.name ?? "Conta sem nome";
                    const accountType = account?.tipo ?? account?.type ?? "Tipo não informado";
                    const rawBalance =
                      account?.saldo ?? account?.balance ?? account?.valor ?? account?.amount ?? 0;
                    const accountId =
                      account?.id ?? account?.accountId ?? account?.contaId ?? `${accountName}-${accountType}`;
                    return (
                      <li key={accountId} className="accounts__item">
                        <div className="accounts__item-icon">
                          <span className="accounts__item-letter">
                            {accountName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="accounts__item-info">
                          <h3 className="accounts__item-name mb-1">{accountName}</h3>
                          <span className="accounts__item-type">{accountType}</span>
                        </div>
                        <div className="accounts__item-balance ms-auto">
                          <span className="accounts__item-balance-label text-muted">Saldo atual</span>
                          <strong className="accounts__item-balance-value">
                            {formatCurrency(rawBalance)}
                          </strong>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="accounts__empty">
                  <h3 className="accounts__empty-title h5">Nenhuma conta cadastrada ainda</h3>
                  <p className="accounts__empty-description text-muted mb-3">
                    Adicione contas para visualizar de onde o dinheiro sai e acompanhar os saldos.
                  </p>
                  <button
                    className="btn btn-outline-primary rounded-pill px-4"
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("nome");
                      if (input) {
                        input.focus();
                      }
                    }}
                  >
                    Cadastrar primeira conta
                  </button>
                </div>
              )
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}
