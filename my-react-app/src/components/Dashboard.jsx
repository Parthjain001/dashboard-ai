import React, { useState } from "react";
import ProfileTab from "./ProfileTab";
import OrdersTab from "./OrdersTab";

function Dashboard({ customerId }) {
  const [tab, setTab] = useState("profile");

  return (
    <div>
      <button onClick={() => setTab("profile")}>Profile</button>
      <button onClick={() => setTab("orders")}>Orders</button>
      <div style={{ marginTop: 20 }}>
        {tab === "profile" ? (
          <ProfileTab customerId={customerId} />
        ) : (
          <OrdersTab customerId={customerId} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;