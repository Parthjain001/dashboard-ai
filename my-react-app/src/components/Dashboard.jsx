import React, { useState } from "react";
import OrdersTab from "./OrdersTab";
import ProfileTab from "./ProfileTab";
import "./Dashboard.css";

function Dashboard({ customerId }) {
  const [activeTab, setActiveTab] = useState("orders");

  return (
    <div className="dashboard-container">
      <div className="tabs">
        <button
          className={`tab${activeTab === "orders" ? " active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </button>
        <button
          className={`tab${activeTab === "profile" ? " active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>
      </div>
      {activeTab === "orders" ? (
        <OrdersTab customerId={customerId} />
      ) : (
        <ProfileTab customerId={customerId} />
      )}
    </div>
  );
}

export default Dashboard;