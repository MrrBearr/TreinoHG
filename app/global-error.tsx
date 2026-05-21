"use client";

/**
 * Last-resort error boundary — used when the root layout itself throws.
 * Must include its own <html> and <body> since no parent layout renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0c",
          color: "#fafafa",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.5, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            TreinoHG
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
            Recarregue a página para tentar de novo.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 24px",
              borderRadius: 999,
              border: "none",
              background: "#22c55e",
              color: "#0a0a0c",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
