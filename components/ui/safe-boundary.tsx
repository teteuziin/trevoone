"use client";

import { Component, ReactNode } from "react";

interface SafeBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface SafeBoundaryState {
  hasError: boolean;
}

/**
 * SafeBoundary — Isolador de falhas de componentes client não-críticos.
 * Garante que falhas em widgets auxiliares (status de rede, PWA, notificações)
 * não causem crash ou tela branca na aplicação principal.
 */
export class SafeBoundary extends Component<SafeBoundaryProps, SafeBoundaryState> {
  constructor(props: SafeBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SafeBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[SafeBoundary:${this.props.name || "Widget"}] error caught safely:`, error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
