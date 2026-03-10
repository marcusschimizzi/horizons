"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);


    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-primary px-4">

      <div
        className="absolute w-[500px] h-[400px] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #d4a053 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-md">

        <div className="bg-bg-secondary/80 backdrop-blur-sm border border-bg-surface rounded-2xl p-8 shadow-2xl">

          <h1
            className="text-4xl font-medium text-center mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Horizon
          </h1>
          <p className="text-text-secondary text-center text-sm mb-8">
            Welcome back
          </p>


          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label
                htmlFor="email"
                className="block text-sm text-text-secondary mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-bg-surface border border-bg-surface rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-glow focus:ring-1 focus:ring-accent-glow/30 transition-colors"
                placeholder="you@example.com"
              />
            </div>


            <div>
              <label
                htmlFor="password"
                className="block text-sm text-text-secondary mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-bg-surface border border-bg-surface rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-glow focus:ring-1 focus:ring-accent-glow/30 transition-colors"
                placeholder="••••••••"
              />
            </div>


            {error && (
              <p className="text-sm text-center" style={{ color: "#e07a5f" }}>
                {error}
              </p>
            )}


            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-accent-glow text-bg-primary font-medium rounded-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>


          <p className="text-center text-text-secondary text-sm mt-6">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="text-accent-glow hover:brightness-110 transition-colors"
            >
              Create one
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
