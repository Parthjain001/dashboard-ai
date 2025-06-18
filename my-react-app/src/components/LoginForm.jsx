import React, { useState } from "react";

function LoginForm({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const query = `
      query($phone: String!) {
        customer_ids_by_phone(phone: $phone)
      }
    `;
    const res = await fetch("http://localhost:5000/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { phone } }),
    });
    const json = await res.json();
    setLoading(false);
    const ids = json.data?.customer_ids_by_phone || [];
    if (ids.length === 0) {
      setError("No customer found for this phone number.");
    } else {
      onLogin(ids[0]); // Use the first customer id found
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Phone Number:
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Loading..." : "Login"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}

export default LoginForm;