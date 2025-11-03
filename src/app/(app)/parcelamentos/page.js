"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { installmentsApi } from "@/api/api";
import useParcelamentos from "@/hooks/useParcelamentos";
import { formatCurrency } from "@/utils/formatters";
import ContaSelect from "@/components/finance/ContaSelect";
import ParcelamentoManageCard from "@/components/finance/ParcelamentoManageCard";
import ParcelamentoPaymentModal from "@/components/finance/ParcelamentoPaymentModal";

function createInitialFormState() {
  return {
    nome: "",
    descricao: "",
    categoria: "",
    valorTotal: "",
    quantidadeParcelas: "",
    dataPrimeiraParcela: dayjs().format("YYYY-MM-DD"),
    contaPadraoId: "",
  };
}

function validateForm({ nome, valorTotal, quantidadeParcelas, dataPrimeiraParcela }) {
  const errors = {};
  const trimmedName = nome?.trim();

  if (!trimmedName) {
    errors.nome = "Informe o nome do parcelamento.";
  }

  const normalizedValue = Number(String(valorTotal).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    errors.valorTotal = "O valor total deve ser um número positivo.";
  }

  const normalizedInstallments = Number.parseInt(quantidadeParcelas, 10);
  if (!Number.isInteger(normalizedInstallments) || normalizedInstallments <= 0) {
    errors.quantidadeParcelas = "Informe uma quantidade de parcelas válida.";
  }

  const normalizedDate = dayjs(dataPrimeiraParcela);
  if (!normalizedDate.isValid()) {
    errors.dataPrimeiraParcela = "Informe uma data de início válida.";
  }

  return {
    errors,
    normalizedValue,
    normalizedInstallments,
    normalizedDate: normalizedDate.isValid() ? normalizedDate.format("YYYY-MM-DD") : null,
  };
}

export default function ParcelamentosPage() {
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState(null);
  const [formState, setFormState] = useState(() => createInitialFormState());
  const [formErrors, setFormErrors] = useState({});
  const [feedback, setFeedback] = useState({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedParcelamento, setSelectedParcelamento] = useState(null);
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
    data: installments,
    isLoading,
    error,
    refresh,
  } = useParcelamentos({ usuarioId });

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
    setEditingInstallment(null);
    setFeedback({ type: "idle", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { errors, normalizedValue, normalizedInstallments, normalizedDate } = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0 || !usuarioId) {
      return;
    }

    const contaPadraoNumeric = formState.contaPadraoId ? Number(formState.contaPadraoId) : null;
    const trimmedCategoria = formState.categoria?.trim() || null;
    const trimmedDescricao = formState.descricao?.trim() || null;

    const payload = {
      nome: formState.nome.trim(),
      descricao: trimmedDescricao,
      categoria: trimmedCategoria,
      valorTotal: Number(normalizedValue.toFixed(2)),
      qtdParcelas: normalizedInstallments,
      inicio: normalizedDate,
      contaPadraoId: Number.isFinite(contaPadraoNumeric) ? contaPadraoNumeric : null,
      usuarioId,
    };

    setIsSubmitting(true);
    setFeedback({ type: "idle", message: "" });

    try {
      if (editingInstallment?.id ?? editingInstallment?.parcelamentoId) {
        const installmentId = editingInstallment.id ?? editingInstallment.parcelamentoId;
        await installmentsApi.update(installmentId, payload);
        setFeedback({ type: "success", message: "Parcelamento atualizado com sucesso." });
      } else {
        await installmentsApi.create(payload);
        setFeedback({ type: "success", message: "Parcelamento criado com sucesso." });
      }
      resetForm();
      refresh();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.erro ||
        "Não foi possível salvar o parcelamento. Verifique os dados e tente novamente.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (installment) => {
    setEditingInstallment(installment);
    setFormState({
      nome: installment?.nome ?? installment?.descricao ?? "",
      descricao: installment?.descricao ?? "",
      categoria: installment?.categoria ?? installment?.categoriaNome ?? "",
      valorTotal: installment?.valorTotal ?? installment?.valor ?? "",
      quantidadeParcelas: String(
        installment?.quantidadeParcelas ??
          installment?.qtdParcelas ??
          installment?.totalParcelas ??
          "",
      ),
      dataPrimeiraParcela:
        installment?.dataPrimeiraParcela ??
        installment?.dataInicio ??
        dayjs().format("YYYY-MM-DD"),
      contaPadraoId:
        installment?.contaPadraoId != null
          ? String(installment.contaPadraoId)
          : installment?.contaPadrao?.id != null
            ? String(installment.contaPadrao.id)
            : installment?.contaPadrao?.contaId != null
              ? String(installment.contaPadrao.contaId)
              : "",
    });
    setFormErrors({});
    setFeedback({ type: "idle", message: "" });
  };

  const handleDelete = async (installment) => {
    if (!installment) return;
    const installmentId = installment.id ?? installment.parcelamentoId;
    if (!installmentId) {
      setFeedback({ type: "error", message: "Não foi possível identificar o parcelamento." });
      return;
    }

    const confirmDelete = window.confirm(
      `Deseja realmente excluir o parcelamento "${installment?.nome ?? installment?.descricao}"?`,
    );
    if (!confirmDelete) {
      return;
    }

    try {
      await installmentsApi.remove(installmentId);
      setFeedback({ type: "success", message: "Parcelamento excluído com sucesso." });
      if (editingInstallment && (editingInstallment.id ?? editingInstallment.parcelamentoId) === installmentId) {
        resetForm();
      }
      refresh();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.erro ||
        "Não foi possível excluir o parcelamento.";
      setFeedback({ type: "error", message });
    }
  };

  const handleRegisterPayment = (installment) => {
    if (!installment) {
      return;
    }
    setSelectedParcelamento(installment);
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedParcelamento(null);
  };

  const totalRemaining = useMemo(() => {
    return installments.reduce((sum, installment) => {
      const total = Number(installment?.valorTotal ?? installment?.valor ?? 0);
      const totalInstallments = Number(
        installment?.quantidadeParcelas ?? installment?.qtdParcelas ?? installment?.totalParcelas ?? 1,
      );
      const paidInstallments = Number(installment?.parcelasPagas ?? installment?.pagas ?? installment?.parcelasQuitadas ?? 0);
      const perInstallment = totalInstallments > 0 ? total / totalInstallments : 0;
      const remaining = Math.max(0, totalInstallments - paidInstallments) * perInstallment;
      return sum + (Number.isFinite(remaining) ? remaining : 0);
    }, 0);
  }, [installments]);

  return (
    <section className="parcelamentos container py-4 py-lg-5">
      <header className="parcelamentos__header d-flex flex-column flex-lg-row align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill parcelamentos__badge text-uppercase">Parcelamentos</span>
          <h1 className="parcelamentos__title display-6 fw-semibold mt-2 mb-0">
            Organize seus compromissos parcelados
          </h1>
          <p className="parcelamentos__subtitle text-muted mb-0">
            Controle financiamentos, compras parceladas e acompanhe o saldo restante de cada contrato.
          </p>
        </div>
        <div className="ms-lg-auto">
          <div className="parcelamentos__total card border-0">
            <div className="card-body py-3 px-4">
              <span className="parcelamentos__total-label text-uppercase">Saldo restante estimado</span>
              <strong className="parcelamentos__total-value">{formatCurrency(totalRemaining)}</strong>
              <span className="parcelamentos__total-count text-muted">
                {installments.length} {installments.length === 1 ? "parcelamento cadastrado" : "parcelamentos cadastrados"}
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
                {editingInstallment ? "Editar parcelamento" : "Novo parcelamento"}
              </h2>
              <p className="panel-card__subtitle text-muted mb-0">
                Cadastre parcelamentos para acompanhar parcelas futuras e registrar pagamentos.
              </p>
            </header>

            <form className="parcelamentos-form" noValidate onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="nome">
                  Nome
                </label>
                <input
                  className={`form-control${formErrors.nome ? " is-invalid" : ""}`}
                  id="nome"
                  name="nome"
                  placeholder="Ex.: Notebook novo"
                  value={formState.nome}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.nome ? <div className="invalid-feedback">{formErrors.nome}</div> : null}
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
                <label className="form-label fw-semibold" htmlFor="categoria">
                  Categoria <span className="text-muted fw-normal">(opcional)</span>
                </label>
                <input
                  className="form-control"
                  id="categoria"
                  name="categoria"
                  placeholder="Ex.: Educação, Tecnologia, Veículos"
                  value={formState.categoria}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="valorTotal">
                  Valor total
                </label>
                <input
                  className={`form-control${formErrors.valorTotal ? " is-invalid" : ""}`}
                  id="valorTotal"
                  name="valorTotal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formState.valorTotal}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.valorTotal ? <div className="invalid-feedback">{formErrors.valorTotal}</div> : null}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="quantidadeParcelas">
                  Quantidade de parcelas
                </label>
                <input
                  className={`form-control${formErrors.quantidadeParcelas ? " is-invalid" : ""}`}
                  id="quantidadeParcelas"
                  name="quantidadeParcelas"
                  type="number"
                  min="1"
                  max="240"
                  value={formState.quantidadeParcelas}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.quantidadeParcelas ? (
                  <div className="invalid-feedback">{formErrors.quantidadeParcelas}</div>
                ) : null}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="dataPrimeiraParcela">
                  Data da primeira parcela
                </label>
                <input
                  className={`form-control${formErrors.dataPrimeiraParcela ? " is-invalid" : ""}`}
                  id="dataPrimeiraParcela"
                  name="dataPrimeiraParcela"
                  type="date"
                  value={formState.dataPrimeiraParcela}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.dataPrimeiraParcela ? (
                  <div className="invalid-feedback">{formErrors.dataPrimeiraParcela}</div>
                ) : null}
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
                    : editingInstallment
                      ? "Atualizar parcelamento"
                      : "Cadastrar parcelamento"}
                </button>
                {editingInstallment ? (
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
                <h2 className="panel-card__title h5 mb-1">Parcelamentos cadastrados</h2>
                <p className="panel-card__subtitle text-muted mb-0">
                  Visualize cada contrato, registre pagamentos e acompanhe o saldo residual.
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
              <div className="parcelamentos__loader">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Carregando parcelamentos...
              </div>
            ) : null}

            {!isLoading && !error ? (
              installments.length ? (
                <div className="parcelamentos__grid">
                  {installments.map((installment, index) => (
                    <ParcelamentoManageCard
                      key={
                        installment.id ??
                        installment.parcelamentoId ??
                        `${installment.nome ?? installment.descricao ?? "parcelamento"}-${index}`
                      }
                      data={installment}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onRegisterPayment={handleRegisterPayment}
                    />
                  ))}
                </div>
              ) : (
                <div className="parcelamentos__empty">
                  <h3 className="parcelamentos__empty-title h5">Nenhum parcelamento cadastrado</h3>
                  <p className="parcelamentos__empty-description text-muted mb-3">
                    Cadastre financiamentos ou compras parceladas para acompanhar aqui.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-primary rounded-pill px-4"
                    onClick={() => {
                      const input = document.getElementById("nome");
                      if (input) input.focus();
                    }}
                  >
                    Criar parcelamento
                  </button>
                </div>
              )
            ) : null}
          </section>
        </div>
      </div>

      <ParcelamentoPaymentModal
        parcelamento={selectedParcelamento}
        isOpen={paymentModalOpen}
        onClose={closePaymentModal}
        usuarioId={usuarioId}
        onPaymentRegistered={() => {
          refresh();
        }}
      />
    </section>
  );
}
