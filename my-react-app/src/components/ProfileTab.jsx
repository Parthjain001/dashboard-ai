import React, { useEffect, useState } from "react";

function ProfileTab({ customerId }) {
  const [profile, setProfile] = useState(null);

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
    };
    fetchProfile();
  }, [customerId]);

  if (!profile) return <p>Loading...</p>;

  return (
    <div>
      <h3>
        {profile.firstName} {profile.lastName}
      </h3>
      <p>Email: {profile.email}</p>
      <p>Phone: {profile.phone}</p>
      <p>Created At: {profile.createdAt}</p>
      <h4>Default Address</h4>
      {profile.defaultAddress ? (
        <div>
          <p>
            {profile.defaultAddress.address1} {profile.defaultAddress.address2}
          </p>
          <p>
            {profile.defaultAddress.city}, {profile.defaultAddress.province},{" "}
            {profile.defaultAddress.country} {profile.defaultAddress.zip}
          </p>
          <p>Phone: {profile.defaultAddress.phone}</p>
        </div>
      ) : (
        <p>No default address.</p>
      )}
    </div>
  );
}

export default ProfileTab;