import React, { useEffect, useState } from "react";
import "./ProfileTab.css";

function ProfileTab({ customerId }) {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const query = `
        query($customerId: String!) {
          customer_details_by_id(customerId: $customerId) {
            id
            firstName
            lastName
            email
            phone
            createdAt
            defaultAddress {
              address1
              address2
              city
              province
              country
              zip
              phone
            }
          }
        }
      `;
      const res = await fetch("http://localhost:5000/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { customerId } }),
      });
      const json = await res.json();
      setProfile(json.data?.customer_details_by_id);
      setForm(json.data?.customer_details_by_id || {});
    };
    fetchProfile();
  }, [customerId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const mutation = `
      mutation($customerId: String!, $firstName: String, $lastName: String, $email: String, $phone: String) {
        update_customer_profile(customerId: $customerId, firstName: $firstName, lastName: $lastName, email: $email, phone: $phone) {
          id
          firstName
          lastName
          email
          phone
          createdAt
          defaultAddress {
            address1
            address2
            city
            province
            country
            zip
            phone
          }
        }
      }
    `;
    const res = await fetch("http://localhost:5000/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: mutation,
        variables: {
          customerId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
        },
      }),
    });
    const json = await res.json();
    if (json.errors) {
      setError(json.errors[0].message);
    } else {
      setProfile(json.data.update_customer_profile);
      setEdit(false);
    }
    setSaving(false);
  };

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="profile-card">
      {!edit ? (
        <>
          <div className="profile-title">
            {profile.firstName} {profile.lastName}
          </div>
          <div className="profile-section">
            <span className="profile-label">Email:</span>
            <span className="profile-value">{profile.email}</span>
          </div>
          <div className="profile-section">
            <span className="profile-label">Phone:</span>
            <span className="profile-value">{profile.phone}</span>
          </div>
          <div className="profile-section">
            <span className="profile-label">Created At:</span>
            <span className="profile-value">
              {profile.createdAt
                ? new Date(profile.createdAt).toLocaleString()
                : ""}
            </span>
          </div>
          <div className="profile-section">
            <span className="profile-label">Default Address:</span>
            {profile.defaultAddress ? (
              <div style={{ marginTop: 4 }}>
                <div>
                  {profile.defaultAddress.address1} {profile.defaultAddress.address2}
                </div>
                <div>
                  {profile.defaultAddress.city}, {profile.defaultAddress.province},{" "}
                  {profile.defaultAddress.country} {profile.defaultAddress.zip}
                </div>
                <div>Phone: {profile.defaultAddress.phone}</div>
              </div>
            ) : (
              <span className="profile-value">No default address.</span>
            )}
          </div>
          <button onClick={() => setEdit(true)}>Edit Profile</button>
        </>
      ) : (
        <form className="profile-edit-form" onSubmit={handleSave}>
          <div>
            <label>First Name:</label>
            <input
              name="firstName"
              value={form.firstName || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Last Name:</label>
            <input
              name="lastName"
              value={form.lastName || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Email:</label>
            <input
              name="email"
              type="email"
              value={form.email || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Phone:</label>
            <input
              name="phone"
              type="tel"
              value={form.phone || ""}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={() => setEdit(false)} disabled={saving}>
            Cancel
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}

export default ProfileTab;