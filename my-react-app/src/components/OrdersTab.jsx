import React, { useEffect, useState } from "react";

function getProductUrl(productHandle) {
  if (!productHandle) return "#";
  return `https://folk-bazar.myshopify.com/products/${productHandle}`;
}

async function fetchProductHandle(productId) {
  const query = `
    query($productId: String!) {
      product_by_id(productId: $productId) {
        handle
      }
    }
  `;
  const res = await fetch("http://localhost:5000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { productId } }),
  });
  const json = await res.json();
  return json.data?.product_by_id?.handle || null;
}

function OrdersTab({ customerId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [endCursor, setEndCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [cursors, setCursors] = useState([null]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [handleCache, setHandleCache] = useState({});

  const fetchOrders = async (after = null, searchTerm = "") => {
    setLoading(true);
    const query = `
      query($customerId: String!, $after: String, $search: String) {
        orders_by_customer_id(customerId: $customerId, after: $after, search: $search) {
          orders {
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
              productId
              originalUnitPrice {
                amount
                currencyCode
              }
            }
          }
          hasNextPage
          endCursor
        }
      }
    `;
    const res = await fetch("http://localhost:5000/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { customerId, after, search: searchTerm } }),
    });
    const json = await res.json();
    
    const data = json.data?.orders_by_customer_id;
    setOrders(data?.orders || []);
    setHasNextPage(data?.hasNextPage || false);
    setEndCursor(data?.endCursor || null);
    setLoading(false);
  };

  useEffect(() => {
    setCursors([null]);
    fetchOrders(null, search);
    // eslint-disable-next-line
  }, [customerId, search]);

  const handleNext = () => {
    setCursors((prev) => [...prev, endCursor]);
    fetchOrders(endCursor, search);
  };

  const handlePrev = () => {
    if (cursors.length > 1) {
      const prevCursors = [...cursors];
      prevCursors.pop();
      setCursors(prevCursors);
      fetchOrders(prevCursors[prevCursors.length - 1], search);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleClear = () => {
    setSearchInput("");
    setSearch("");
  };

  // Fetch missing product handles after orders load
  useEffect(() => {
    const missing = {};
    orders.forEach((order) => {
      (order.lineItems || []).forEach((item) => {
        if (item.productId && !handleCache[item.productId]) {
          missing[item.productId] = true;
        }
      });
    });
    const missingIds = Object.keys(missing);
    if (missingIds.length > 0) {
      Promise.all(
        missingIds.map(async (productId) => {
          const handle = await fetchProductHandle(productId);
          return { productId, handle };
        })
      ).then((results) => {
        setHandleCache((prev) => {
          const updated = { ...prev };
          results.forEach(({ productId, handle }) => {
            updated[productId] = handle;
          });
          return updated;
        });
      });
    }
    // eslint-disable-next-line
  }, [orders]);

  const renderLineItems = (lineItems) =>
    lineItems && lineItems.length > 0
      ? lineItems.map((item, idx) => {
          const handle = handleCache[item.productId];
          return (
            <div key={idx}>
              {handle ? (
                <a
                  href={getProductUrl(handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.title}
                </a>
              ) : (
                <span>{item.title}</span>
              )}{" "}
              (x{item.quantity})
            </div>
          );
        })
      : "N/A";

  return (
    <div>
      <form onSubmit={handleSearch} style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Search by Order ID"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit">Search</button>
        <button type="button" onClick={handleClear} style={{ marginLeft: 5 }}>
          Clear
        </button>
      </form>
      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Created At</th>
                <th>Total Price</th>
                <th>Shipment Status</th>
                <th>Tracking Link</th>
                <th>Items Ordered</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.name}</td>
                  <td>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString()
                      : ""}
                  </td>
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
                  <td>{renderLineItems(order.lineItems)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="button-group">
            <button onClick={handlePrev} disabled={cursors.length <= 1}>
              Prev
            </button>
            <button onClick={handleNext} disabled={!hasNextPage}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default OrdersTab;