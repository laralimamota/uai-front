"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import api from "@/api/api";

const INITIAL_STATE = {
  data: [],
  isLoading: false,
  error: "",
};

export default function useTransacoes({ competencia, usuarioId }) {
  const [state, setState] = useState(INITIAL_STATE);

  const fetchTransacoes = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!competencia || !usuarioId) {
        startTransition(() => {
          setState((previous) => ({
            ...previous,
            data: [],
            error: usuarioId ? "" : "Usuário não identificado.",
            isLoading: false,
          }));
        });
        return;
      }

      startTransition(() => {
        setState((previous) => ({
          ...previous,
          isLoading: silent ? previous.isLoading : true,
          error: "",
        }));
      });

      try {
        const requestConfig = {
          params: {
            usuarioId,
            competencia,
          },
        };

        if (requestConfig.params.usuarioId === undefined) {
          delete requestConfig.params.usuarioId;
        }

        if (requestConfig.params.usuarioId !== undefined) {
          requestConfig.params.usuarioId = Number(requestConfig.params.usuarioId);
        }

        if (signal) {
          requestConfig.signal = signal;
        }

        const response = await api.get("/transacoes", requestConfig);
        const payload = response?.data;
        const normalizedData = Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

        startTransition(() => {
          setState({
            data: normalizedData,
            isLoading: false,
            error: "",
          });
        });
      } catch (requestError) {
        if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") {
          return;
        }

        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.erro ||
          "Não foi possível carregar as transações do mês.";

        startTransition(() => {
          setState({
            data: [],
            isLoading: false,
            error: message,
          });
        });
      }
    },
    [competencia, usuarioId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchTransacoes({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchTransacoes]);

  const refresh = useCallback(() => {
    fetchTransacoes({ silent: true });
  }, [fetchTransacoes]);

  return {
    ...state,
    refresh,
  };
}
