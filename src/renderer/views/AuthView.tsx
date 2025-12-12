import React from "react";

import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import type { AuthMode } from "../types";

type AuthForm = {
    email: string;
    password: string;
};

type AuthViewProps = {
    mode: AuthMode;
    form: AuthForm;
    error: string | null;
    isSubmitting: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onFieldChange: (
        field: keyof AuthForm
    ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleMode: () => void;
};

export const AuthView: React.FC<AuthViewProps> = ({
    mode,
    form,
    error,
    isSubmitting,
    onSubmit,
    onFieldChange,
    onToggleMode,
}) => (
    <section className="gateway-panel auth-card">
        <p className="panel-label">Welcome</p>
        <h2>
            {mode === "login"
                ? "Sign in to continue"
                : "Create your Inkline account"}
        </h2>
        <p className="panel-subtitle">
            Securely sync your projects and pick up where you left off.
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-form-inputs">
                <div className="input-field">
                    <Label htmlFor="auth-email">Email</Label>
                    <Input
                        id="auth-email"
                        type="email"
                        value={form.email}
                        onChange={onFieldChange("email")}
                        autoComplete="email"
                        required
                    />
                </div>
                <div className="input-field">
                    <Label htmlFor="auth-password">Password</Label>
                    <Input
                        id="auth-password"
                        type="password"
                        value={form.password}
                        onChange={onFieldChange("password")}
                        autoComplete={
                            mode === "login" ? "current-password" : "new-password"
                        }
                        required
                    />
                </div>
            </div>
            {error ? <span className="card-hint is-error">{error}</span> : null}
            <Button type="submit" variant="primary" style={{marginBottom: "0.5rem"}} disabled={isSubmitting}>
                {isSubmitting
                    ? mode === "login"
                        ? "Signing in…"
                        : "Creating account…"
                    : mode === "login"
                      ? "Sign in"
                      : "Create account"}
            </Button>
        </form>
        <Button type="button" variant="ghost" style={{width: "100%"}} onClick={onToggleMode}>
            {mode === "login"
                ? "Need an account? Register"
                : "Already have an account? Log in"}
        </Button>
    </section>
);
