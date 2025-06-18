import React, { useEffect, useState } from "react";

function OrdersTab({ customerId }) {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const query = `
        query($customerId: String!) {
          orders_by_customer_id(customerId: $customerId) {
            id
            name
            createdAt
            totalPrice {
              amount
              currencyCode
            }
            shipmentStatus
            trackingLink
            lineItems {
              title
              quantity
              originalUnitPrice {
                amount
                currencyCode
              }
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
      setOrders(json.data?.orders_by_customer_id || []);
    };
    fetchOrders();
  }, [customerId]);

  if (orders === null) return <p>Loading...</p>;
  if (!orders.length) return <p>No orders found.</p>;

  return (
    <table border="1">
      <thead>
        <tr>
          <th>Order Name</th>
          <th>Created At</th>
          <th>Total Price</th>
          <th>Shipment Status</th>
          <th>Tracking Link</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.name}</td>
            <td>{order.createdAt}</td>
            <td>
              {order.totalPrice.amount} {order.totalPrice.currencyCode}
            </td>
            <td>{order.shipmentStatus || "N/A"}</td>
            <td>
              {order.trackingLink ? (
                <a href={order.trackingLink} target="_blank" rel="noopener noreferrer">
                  Track
                </a>
              ) : (
                "N/A"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default OrdersTab;