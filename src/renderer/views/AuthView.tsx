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
    resetPasswordSuccess: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onFieldChange: (
        field: keyof AuthForm
    ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleMode: () => void;
    onForgotPassword: () => void;
    onResetPassword: (event: React.FormEvent<HTMLFormElement>) => void;
};

export const AuthView: React.FC<AuthViewProps> = ({
    mode,
    form,
    error,
    isSubmitting,
    resetPasswordSuccess,
    onSubmit,
    onFieldChange,
    onToggleMode,
    onForgotPassword,
    onResetPassword,
}) => {
    if (mode === "resetPassword") {
        return (
            <section className="gateway-panel auth-card">
                <p className="panel-label">Password Recovery</p>
                <h2>Reset your password</h2>
                <p className="panel-subtitle">
                    Enter your email and we'll send you a link to reset your
                    password.
                </p>
                {resetPasswordSuccess ? (
                    <>
                        <span className="card-hint is-success">
                            Check your email for a password reset link.
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            style={{ width: "100%", marginTop: "0.5rem" }}
                            onClick={onToggleMode}
                        >
                            Back to sign in
                        </Button>
                    </>
                ) : (
                    <>
                        <form className="auth-form" onSubmit={onResetPassword}>
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
                            </div>
                            {error ? (
                                <span className="card-hint is-error">
                                    {error}
                                </span>
                            ) : null}
                            <Button
                                type="submit"
                                variant="primary"
                                style={{ marginBottom: "0.5rem" }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? "Sending…"
                                    : "Send Reset Email"}
                            </Button>
                        </form>
                        <Button
                            type="button"
                            variant="ghost"
                            style={{ width: "100%" }}
                            onClick={onToggleMode}
                        >
                            Back to sign in
                        </Button>
                    </>
                )}
            </section>
        );
    }

    return (
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
                                mode === "login"
                                    ? "current-password"
                                    : "new-password"
                            }
                            required
                        />
                    </div>
                </div>
                {mode === "login" ? (
                    <Button
                        type="button"
                        variant="ghost"
                        style={{
                            alignSelf: "flex-start",
                            padding: 0,
                            fontSize: "0.85rem",
                        }}
                        onClick={onForgotPassword}
                    >
                        Forgot password?
                    </Button>
                ) : null}
                {error ? (
                    <span className="card-hint is-error">{error}</span>
                ) : null}
                <Button
                    type="submit"
                    variant="primary"
                    style={{ marginBottom: "0.5rem" }}
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? mode === "login"
                            ? "Signing in…"
                            : "Creating account…"
                        : mode === "login"
                          ? "Sign in"
                          : "Create account"}
                </Button>
            </form>
            <Button
                type="button"
                variant="ghost"
                style={{ width: "100%" }}
                onClick={onToggleMode}
            >
                {mode === "login"
                    ? "Need an account? Register"
                    : "Already have an account? Log in"}
            </Button>
        </section>
    );
};
