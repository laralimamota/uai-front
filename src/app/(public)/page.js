"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api from "@/api/api";
import ThemeToggle from "@/components/theme/ThemeToggle";
import UaiWordmark from "@/components/branding/UaiWordmark";

const initialFormState = {
  email: "",
  password: "",
};

function validateForm({ email, password }) {
  const validationErrors = {};

  if (!email.trim()) {
    validationErrors.email = "Informe seu e-mail.";
  } else {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      validationErrors.email = "Informe um e-mail válido.";
    }
  }

  if (!password.trim()) {
    validationErrors.password = "Informe sua senha.";
  } else if (password.length < 6) {
    validationErrors.password = "A senha deve ter pelo menos 6 caracteres.";
  }

  return validationErrors;
}

export default function LoginPage() {
  const router = useRouter();
  const [formState, setFormState] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid =
    formState.email.trim() !== "" &&
    formState.password.trim() !== "" &&
    Object.keys(errors).length === 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUser = window.localStorage.getItem("uai:user");
    if (storedUser) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextState = { ...formState, [name]: value };
    setFormState(nextState);
    setErrors(validateForm(nextState));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm(formState);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setServerError("");
    setIsSubmitting(true);

    try {
      const response = await api.post("/usuarios/login", {
        email: formState.email,
        senha: formState.password,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("uai:user", JSON.stringify(response.data));
      }

      router.push("/dashboard");
    } catch (error) {
      const apiErrorMessage =
        error.response?.data?.message ||
        error.response?.data?.erro ||
        "Não foi possível autenticar. Verifique suas credenciais e tente novamente.";
      setServerError(apiErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-section container py-5 min-vh-100 d-flex flex-column">
      <div className="auth-section__toggle">
        <ThemeToggle className="theme-toggle--ghost" />
      </div>
      <div className="auth-section__split flex-grow-1 d-flex flex-column flex-lg-row align-items-stretch">
        <div className="auth-panel auth-panel--form order-2 order-lg-1">
          <div className="auth-content w-100">
            <div className="auth-hero text-center text-lg-start mb-4">
              <span className="auth-pill badge rounded-pill px-4 py-2 fs-6">Bem-vindo à UAI</span>
              <h1 className="display-6 fw-bold mt-3">Seu hub financeiro inteligente</h1>
              <p className="text-muted">
                Entre com suas credenciais para acessar o ecossistema de contas, transações e insights.
              </p>
            </div>

            <form
              className="auth-card card border-0 p-4"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="email">
                  E-mail
                </label>
                <input
                  className={`form-control${errors.email ? " is-invalid" : ""}`}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seuemail@dominio.com"
                  value={formState.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={isSubmitting}
                  required
                />
                {errors.email ? <div className="invalid-feedback">{errors.email}</div> : null}
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold" htmlFor="password">
                  Senha
                </label>
                <input
                  className={`form-control${errors.password ? " is-invalid" : ""}`}
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Informe sua senha"
                  value={formState.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  required
                />
                {errors.password ? (
                  <div className="invalid-feedback">{errors.password}</div>
                ) : null}
              </div>

              {serverError ? (
                <div className="alert alert-danger auth-alert" role="alert">
                  {serverError}
                </div>
              ) : null}

              <button
                className="btn btn-primary w-100 rounded-pill py-2"
                type="submit"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>

        <div className="auth-panel auth-panel--visual order-1 order-lg-2">
          <div className="auth-visual">
            <div className="auth-visual__glow" />
            <Image
              src="/logo.png"
              alt="Cofrinho UAI"
              width={320}
              height={320}
              priority
              className="auth-visual__image"
            />
            <UaiWordmark className="auth-visual__wordmark" variant="display" />
          </div>
        </div>
      </div>
    </section>
  );
}
