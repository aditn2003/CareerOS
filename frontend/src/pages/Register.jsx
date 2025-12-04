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

      <input
        placeholder="First name"
        value={form.firstName}
        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
      />
      <input
        placeholder="Last name"
        value={form.lastName}
        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <input
        type="password"
        placeholder="Confirm password"
        value={form.confirmPassword}
        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
      />
      <label className="account-type-label">
        Account type
        <select
          value={form.accountType}
          onChange={(e) => setForm({ ...form, accountType: e.target.value })}
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
