"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import api, { recurrencesApi } from "@/api/api";
import useRecorrencias from "@/hooks/useRecorrencias";
import useCompetencia from "@/hooks/useCompetencia";
import { formatCurrency } from "@/utils/formatters";
import RecorrenciaManageCard from "@/components/finance/RecorrenciaManageCard";
import ContaSelect from "@/components/finance/ContaSelect";

function createInitialFormState() {
  return {
    nome: "",
    categoria: "",
    descricao: "",
    valorMensal: "",
    diaVencimento: String(dayjs().date()),
    inicio: dayjs().format("YYYY-MM-DD"),
    fim: "",
    contaPadraoId: "",
    ativo: true,
  };
}

function validateForm({ nome, valorMensal, diaVencimento, inicio, fim }) {
  const errors = {};
  if (!nome?.trim()) {
    errors.nome = "Informe o nome da recorrência.";
  }

  const numericValor = Number(String(valorMensal).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numericValor) || numericValor <= 0) {
    errors.valorMensal = "O valor mensal deve ser um número positivo.";
  }

  const numericDay = Number.parseInt(diaVencimento, 10);
  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 31) {
    errors.diaVencimento = "Informe um dia entre 1 e 31.";
  }

  const normalizedStart = dayjs(inicio);
  if (!normalizedStart.isValid()) {
    errors.inicio = "Informe uma data de início válida.";
  }

  let normalizedEnd = null;
  if (fim) {
    const parsedEnd = dayjs(fim);
    if (!parsedEnd.isValid()) {
      errors.fim = "Informe uma data final válida.";
    } else if (normalizedStart.isValid() && parsedEnd.isBefore(normalizedStart, "day")) {
      errors.fim = "A data final deve ser posterior ao início.";
    } else {
      normalizedEnd = parsedEnd.format("YYYY-MM-DD");
    }
  }

  return {
    errors,
    numericValor,
    numericDay,
    normalizedStart: normalizedStart.isValid() ? normalizedStart.format("YYYY-MM-DD") : null,
    normalizedEnd,
  };
}

export default function RecorrenciasPage() {
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState(null);
  const [formState, setFormState] = useState(() => createInitialFormState());
  const [formErrors, setFormErrors] = useState({});
  const [feedback, setFeedback] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRecorrencia, setEditingRecorrencia] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { competencia } = useCompetencia();

  useEffect(() => {
    if (typeof window === "undefined") return;
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
    data: recurrences,
    isLoading,
    error,
    refresh,
  } = useRecorrencias({ usuarioId });

  const handleInputChange = (event) => {
    const { name, type, value, checked } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFormErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));
    setFeedback({ type: "idle", message: "" });
  };

  const resetForm = () => {
    setFormState(createInitialFormState());
    setFormErrors({});
    setEditingRecorrencia(null);
    setFeedback({ type: "idle", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { errors, numericValor, numericDay, normalizedStart, normalizedEnd } = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0 || !usuarioId) {
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "idle", message: "" });

    const contaPadraoNumeric = formState.contaPadraoId ? Number(formState.contaPadraoId) : null;
    const trimmedCategoria = formState.categoria?.trim() || null;
    const trimmedDescricao = formState.descricao?.trim() || null;

    const payload = {
      nome: formState.nome.trim(),
      categoria: trimmedCategoria,
      descricao: trimmedDescricao,
      valorMensal: Number(numericValor.toFixed(2)),
      diaVencimento: numericDay,
      inicio: normalizedStart,
      fim: normalizedEnd,
      ativo: Boolean(formState.ativo),
      usuarioId,
      contaPadraoId: Number.isFinite(contaPadraoNumeric) ? contaPadraoNumeric : null,
    };

    try {
      if (editingRecorrencia?.id ?? editingRecorrencia?.recorrenciaId) {
        const recurringId = editingRecorrencia.id ?? editingRecorrencia.recorrenciaId;
        await recurrencesApi.update(recurringId, payload);
        setFeedback({ type: "success", message: "Recorrência atualizada com sucesso." });
      } else {
        await recurrencesApi.create(payload);
        setFeedback({ type: "success", message: "Recorrência criada com sucesso." });
      }
      resetForm();
      refresh();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.erro ||
        "Não foi possível salvar a recorrência. Verifique os dados e tente novamente.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (recurrence) => {
    setEditingRecorrencia(recurrence);
    setFormState({
      nome: recurrence?.nome ?? recurrence?.descricao ?? "",
      categoria: recurrence?.categoria ?? recurrence?.categoriaNome ?? "",
      descricao: recurrence?.descricao ?? "",
      valorMensal:
        recurrence?.valorMensal != null
          ? String(recurrence.valorMensal)
          : recurrence?.valor != null
            ? String(recurrence.valor)
            : recurrence?.valorBase != null
              ? String(recurrence.valorBase)
              : "",
      diaVencimento: String(
        recurrence?.diaVencimento ?? recurrence?.dia ?? recurrence?.diaCobranca ?? dayjs().date(),
      ),
      inicio: recurrence?.inicio ?? recurrence?.dataInicio ?? dayjs().format("YYYY-MM-DD"),
      fim: recurrence?.fim ?? recurrence?.dataFim ?? "",
      contaPadraoId:
        recurrence?.contaPadraoId != null
          ? String(recurrence.contaPadraoId)
          : recurrence?.contaPadrao?.id != null
            ? String(recurrence.contaPadrao.id)
            : recurrence?.contaPadrao?.contaId != null
              ? String(recurrence.contaPadrao.contaId)
              : "",
      ativo: Boolean(
        recurrence?.ativo ??
          recurrence?.ativa ??
          (typeof recurrence?.status === "string"
            ? recurrence.status.toUpperCase().includes("ATIV")
            : undefined) ??
          true,
      ),
    });
    setFormErrors({});
    setFeedback({ type: "idle", message: "" });
  };

  const handleDelete = async (recurrence) => {
    if (!recurrence) return;
    const recurrenceId = recurrence.id ?? recurrence.recorrenciaId;
    if (!recurrenceId) {
      setFeedback({ type: "error", message: "Não foi possível identificar a recorrência." });
      return;
    }
    const confirmDelete = window.confirm(
      `Deseja realmente excluir a recorrência "${recurrence?.nome ?? recurrence?.descricao}"?`,
    );
    if (!confirmDelete) {
      return;
    }

    try {
      await recurrencesApi.remove(recurrenceId);
      setFeedback({ type: "success", message: "Recorrência excluída com sucesso." });
      if (editingRecorrencia && (editingRecorrencia.id ?? editingRecorrencia.recorrenciaId) === recurrenceId) {
        resetForm();
      }
      refresh();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.erro ||
        "Não foi possível excluir a recorrência.";
      setFeedback({ type: "error", message });
    }
  };

  const handleGenerate = async (recurrence) => {
    if (!recurrence) return;
    const recurrenceId = recurrence.id ?? recurrence.recorrenciaId;
    if (!recurrenceId) {
      setFeedback({ type: "error", message: "Não foi possível identificar a recorrência." });
      return;
    }

    try {
      setIsGenerating(true);
      const [anoSegment, mesSegment] = (competencia ?? dayjs().format("YYYY-MM")).split("-");
      const ano = Number(anoSegment);
      const mes = Number(mesSegment);
      await recurrencesApi.generateEntries(recurrenceId, {
        ano: Number.isFinite(ano) ? ano : dayjs().year(),
        mes: Number.isFinite(mes) ? mes : dayjs().month() + 1,
      });
      setFeedback({ type: "success", message: "Transações geradas com sucesso para o mês selecionado." });
      refresh();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.erro ||
        "Não foi possível gerar as transações desta recorrência.";
      setFeedback({ type: "error", message });
    } finally {
      setIsGenerating(false);
    }
  };

  const totalValue = useMemo(() => {
    return recurrences.reduce((sum, recurrence) => {
      const value = Number(recurrence?.valorMensal ?? recurrence?.valor ?? recurrence?.valorBase ?? 0);
      if (Number.isFinite(value)) {
        return sum + value;
      }
      return sum;
    }, 0);
  }, [recurrences]);

  return (
    <section className="recorrencias container py-4 py-lg-5">
      <header className="recorrencias__header d-flex flex-column flex-lg-row align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill recorrencias__badge text-uppercase">Recorrências</span>
          <h1 className="recorrencias__title display-6 fw-semibold mt-2 mb-0">
            Controle seus lançamentos automáticos
          </h1>
          <p className="recorrencias__subtitle text-muted mb-0">
            Configure despesas e receitas recorrentes, gere transações e mantenha o fluxo em dia.
          </p>
        </div>
        <div className="ms-lg-auto">
          <div className="recorrencias__total card border-0">
            <div className="card-body py-3 px-4">
              <span className="recorrencias__total-label text-uppercase">Valor mensal previsto</span>
              <strong className="recorrencias__total-value">{formatCurrency(totalValue)}</strong>
              <span className="recorrencias__total-count text-muted">
                {recurrences.length} {recurrences.length === 1 ? "recorrência cadastrada" : "recorrências cadastradas"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="row g-4">
        <div className="col-12 col-xl-5">
          <section className="panel-card h-100">
            <header className="panel-card__header mb-3">
              <h2 className="panel-card__title h5 mb-1">
                {editingRecorrencia ? "Editar recorrência" : "Nova recorrência"}
              </h2>
              <p className="panel-card__subtitle text-muted mb-0">
                Preencha os dados básicos para registrar pagamentos automáticos.
              </p>
            </header>

            <form className="recorrencias-form" noValidate onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="nome">
                  Nome
                </label>
                <input
                  className={`form-control${formErrors.nome ? " is-invalid" : ""}`}
                  id="nome"
                  name="nome"
                  placeholder="Ex.: Mensalidade da academia"
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
                <label className="form-label fw-semibold" htmlFor="categoria">
                  Categoria <span className="text-muted fw-normal">(opcional)</span>
                </label>
                <input
                  className="form-control"
                  id="categoria"
                  name="categoria"
                  placeholder="Ex.: Saúde, Educação, Moradia"
                  value={formState.categoria}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="descricao">
                  Descrição <span className="text-muted fw-normal">(opcional)</span>
                </label>
                <textarea
                  className="form-control"
                  id="descricao"
                  name="descricao"
                  placeholder="Detalhes adicionais ou observações"
                  value={formState.descricao}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="valorMensal">
                  Valor mensal
                </label>
                <input
                  className={`form-control${formErrors.valorMensal ? " is-invalid" : ""}`}
                  id="valorMensal"
                  name="valorMensal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formState.valorMensal}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.valorMensal ? <div className="invalid-feedback">{formErrors.valorMensal}</div> : null}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="diaVencimento">
                  Dia de cobrança
                </label>
                <input
                  className={`form-control${formErrors.diaVencimento ? " is-invalid" : ""}`}
                  id="diaVencimento"
                  name="diaVencimento"
                  type="number"
                  min="1"
                  max="31"
                  value={formState.diaVencimento}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.diaVencimento ? (
                  <div className="invalid-feedback">{formErrors.diaVencimento}</div>
                ) : null}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="inicio">
                  Início da recorrência
                </label>
                <input
                  className={`form-control${formErrors.inicio ? " is-invalid" : ""}`}
                  id="inicio"
                  name="inicio"
                  type="date"
                  value={formState.inicio}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.inicio ? <div className="invalid-feedback">{formErrors.inicio}</div> : null}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="fim">
                  Fim da recorrência <span className="text-muted fw-normal">(opcional)</span>
                </label>
                <input
                  className={`form-control${formErrors.fim ? " is-invalid" : ""}`}
                  id="fim"
                  name="fim"
                  type="date"
                  value={formState.fim}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
                {formErrors.fim ? <div className="invalid-feedback">{formErrors.fim}</div> : null}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="contaPadraoId">
                  Conta padrão
                </label>
                <ContaSelect
                  usuarioId={usuarioId}
                  value={formState.contaPadraoId}
                  onChange={(nextValue) =>
                    setFormState((previous) => ({
                      ...previous,
                      contaPadraoId: nextValue,
                    }))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-check form-switch mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ativo"
                  name="ativo"
                  checked={formState.ativo}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
                <label className="form-check-label" htmlFor="ativo">
                  Recorrência ativa
                </label>
              </div>

              {feedback.message ? (
                <div
                  className={`alert ${feedback.type === "success" ? "alert-success" : "alert-danger"} py-2`}
                  role="alert"
                >
                  {feedback.message}
                </div>
              ) : null}

              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary rounded-pill py-2"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Salvando..."
                    : editingRecorrencia
                      ? "Atualizar recorrência"
                      : "Cadastrar recorrência"}
                </button>
                {editingRecorrencia ? (
                  <button
                    type="button"
                    className="btn btn-outline-light rounded-pill py-2"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Cancelar edição
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>

        <div className="col-12 col-xl-7">
          <section className="panel-card h-100">
            <header className="panel-card__header d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="panel-card__title h5 mb-1">Recorrências cadastradas</h2>
                <p className="panel-card__subtitle text-muted mb-0">
                  Edite, remova ou gere as transações das recorrências ativas.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => refresh()}
                disabled={isLoading}
              >
                Atualizar
              </button>
            </header>

            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="recorrencias__loader">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Carregando recorrências...
              </div>
            ) : null}

            {!isLoading && !error ? (
              recurrences.length ? (
                <div className="recorrencias__grid">
                  {recurrences.map((recurrence, index) => (
                    <RecorrenciaManageCard
                      key={
                        recurrence.id ??
                        recurrence.recorrenciaId ??
                        `${recurrence.nome ?? recurrence.descricao ?? "recorrencia"}-${index}`
                      }
                      data={recurrence}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onGenerate={handleGenerate}
                    />
                  ))}
                </div>
              ) : (
                <div className="recorrencias__empty">
                  <h3 className="recorrencias__empty-title h5">Nenhuma recorrência cadastrada</h3>
                  <p className="recorrencias__empty-description text-muted mb-3">
                    Adicione sua primeira recorrência para automatizar lançamentos do mês.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-primary rounded-pill px-4"
                    onClick={() => {
                      const input = document.getElementById("nome");
                      if (input) input.focus();
                    }}
                  >
                    Criar recorrência
                  </button>
                </div>
              )
            ) : null}
          </section>
        </div>
      </div>

      {isGenerating ? (
        <div className="recorrencias__backdrop">
          <div className="recorrencias__backdrop-content">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Gerando transações...
          </div>
        </div>
      ) : null}
    </section>
  );
}
