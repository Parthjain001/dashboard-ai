import React, { useState } from "react";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";

function App() {
  const [customerId, setCustomerId] = useState(null);

  return (
    <div>
      {!customerId ? (
        <LoginForm onLogin={setCustomerId} />
      ) : (
        <Dashboard customerId={customerId} />
      )}
    </div>
  );
}

export default App;
