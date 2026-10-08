"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function KirjauduPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">Kirjaudu sisään</h1>
      <p className="mb-6 text-sm text-muted">
        Käyttäjäyhteisö &ndash; jäsenet ja palvelutilit.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sähköposti
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded border border-line bg-paper px-3 py-2 text-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Salasana
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded border border-line bg-paper px-3 py-2 text-base"
          />
        </label>

        {state.error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded bg-accent px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Kirjaudutaan…" : "Kirjaudu"}
        </button>
      </form>

      <p className="mt-8 text-xs text-muted">
        Ei tunnuksia? Jäsen- ja palvelutilit luo ylläpitäjä.
      </p>
    </main>
  );
}
