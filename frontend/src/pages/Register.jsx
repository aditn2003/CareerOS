// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "candidate",
  });
  const { setToken } = useAuth();
  const navigate = useNavigate();

  async function handleRegister() {
    try {
      const { data } = await api.post("/register", {
        ...form,
        accountType: form.accountType || "candidate",
      });
      alert("✅ Registered successfully!");
      setToken(data.token);
      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Registration failed");
    }
  }

  return (
    <section>
      <h2>Create an Account</h2>

      <label htmlFor="reg-first-name">First name</label>
      <input
        id="reg-first-name"
        placeholder="First name"
        value={form.firstName}
        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        aria-label="First name"
        aria-required="true"
      />
      <label htmlFor="reg-last-name">Last name</label>
      <input
        id="reg-last-name"
        placeholder="Last name"
        value={form.lastName}
        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        aria-label="Last name"
        aria-required="true"
      />
      <label htmlFor="reg-email">Email</label>
      <input
        type="email"
        id="reg-email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        aria-label="Email address"
        aria-required="true"
      />
      <label htmlFor="reg-password">Password</label>
      <input
        type="password"
        id="reg-password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        aria-label="Password"
        aria-required="true"
      />
      <label htmlFor="reg-confirm-password">Confirm password</label>
      <input
        type="password"
        id="reg-confirm-password"
        placeholder="Confirm password"
        value={form.confirmPassword}
        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        aria-label="Confirm password"
        aria-required="true"
      />
      <label htmlFor="reg-account-type" className="account-type-label">
        Account type
        <select
          id="reg-account-type"
          value={form.accountType}
          onChange={(e) => setForm({ ...form, accountType: e.target.value })}
          aria-label="Account type"
        >
          <option value="candidate">
            Individual job seeker (candidate)
          </option>
          <option value="mentor">
            Team mentor (career coach or team lead)
          </option>
        </select>
      </label>

      <div className="button-group">
        <button onClick={handleRegister}>Register</button>
        <button className="btn-secondary" onClick={() => navigate("/login")}>
          Have an account? Login
        </button>
      </div>
    </section>
  );
}
