from flask import Flask, request, jsonify
from ariadne import QueryType, make_executable_schema, graphql_sync
from flask_cors import CORS
import requests

import os
from dotenv import load_dotenv

load_dotenv()

SHOPIFY_URL = os.getenv("SHOPIFY_URL")
SHOPIFY_TOKEN = os.getenv("SHOPIFY_TOKEN")

type_defs = """
    type Money {
        amount: String
        currencyCode: String
    }

    type Address {
        address1: String
        address2: String
        city: String
        province: String
        country: String
        zip: String
        phone: String
    }

    type Customer {
        id: String
        firstName: String
        lastName: String
        email: String
        phone: String
        createdAt: String
        defaultAddress: Address
    }

    type LineItem {
        title: String
        quantity: Int
        originalUnitPrice: Money
    }

    type Order {
        id: String!
        name: String!
        createdAt: String
        totalPrice: Money
        shipmentStatus: String
        trackingLink: String
        lineItems: [LineItem]
    }

    type Query {
        customer_ids_by_phone(phone: String!): [String!]!
        customer_details_by_id(customerId: String!): Customer
        orders_by_customer_id(customerId: String!): [Order!]!
    }
"""

query = QueryType()

@query.field("customer_ids_by_phone")
def resolve_customer_ids_by_phone(_, info, phone):
    customer_query = """
    {
      customers(first: 10, query: "phone:%s") {
        edges {
          node {
            id
          }
        }
      }
    }
    """ % phone
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN
    }
    try:
        resp = requests.post(SHOPIFY_URL, headers=headers, json={"query": customer_query})
        resp.raise_for_status()
        data = resp.json()
        return [edge["node"]["id"] for edge in data.get("data", {}).get("customers", {}).get("edges", [])]
    except Exception as e:
        print(f"Error fetching customer ids: {e}")
        return []

@query.field("customer_details_by_id")
def resolve_customer_details_by_id(_, info, customerId):
    customer_query = """
    {
      customer(id: "%s") {
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
    """ % customerId
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN
    }
    try:
        resp = requests.post(SHOPIFY_URL, headers=headers, json={"query": customer_query})
        resp.raise_for_status()
        node = resp.json().get("data", {}).get("customer", None)
        if not node:
            return None
        return {
            "id": node.get("id"),
            "firstName": node.get("firstName"),
            "lastName": node.get("lastName"),
            "email": node.get("email"),
            "phone": node.get("phone"),
            "createdAt": node.get("createdAt"),
            "defaultAddress": node.get("defaultAddress"),
        }
    except Exception as e:
        print(f"Error fetching customer details: {e}")
        return None

@query.field("orders_by_customer_id")
def resolve_orders_by_customer_id(_, info, customerId):
    numeric_id = customerId.split('/')[-1]
    orders_query = f"""
{{
  orders(first: 20, query: "customer_id:{numeric_id}") {{
    edges {{
      node {{
        id
        name
        createdAt
        totalPriceSet {{
          shopMoney {{
            amount
            currencyCode
          }}
        }}
        fulfillments(first: 1) {{
          trackingInfo {{
            number
            url
          }}
          status
        }}
        lineItems(first: 10) {{
          edges {{
            node {{
              title
              quantity
              originalUnitPriceSet {{
                shopMoney {{
                  amount
                  currencyCode
                }}
              }}
            }}
          }}
        }}
      }}
    }}
  }}
}}
"""
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN
    }
    try:
        resp = requests.post(SHOPIFY_URL, headers=headers, json={"query": orders_query})
        resp.raise_for_status()
        orders = resp.json().get("data", {}).get("orders", {}).get("edges", [])
        formatted_orders = []
        for o in orders:
            node = o["node"]
            fulfillments = node.get("fulfillments", [])
            shipment_status = None
            tracking_link = None
            if fulfillments and len(fulfillments) > 0:
                tracking = fulfillments[0].get("trackingInfo", [])
                if tracking and len(tracking) > 0:
                    tracking_link = tracking[0].get("url")
                shipment_status = fulfillments[0].get("status")
            formatted_orders.append({
                "id": node.get("id"),
                "name": node.get("name"),
                "createdAt": node.get("createdAt"),
                "totalPrice": node.get("totalPriceSet", {}).get("shopMoney", {}),
                "shipmentStatus": shipment_status,
                "trackingLink": tracking_link,
                "lineItems": [
                    {
                        "title": li["node"].get("title"),
                        "quantity": li["node"].get("quantity"),
                        "originalUnitPrice": li["node"].get("originalUnitPriceSet", {}).get("shopMoney", {})
                    }
                    for li in node.get("lineItems", {}).get("edges", [])
                ]
            })
        return formatted_orders
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return []

schema = make_executable_schema(type_defs, query)

app = Flask(__name__)
CORS(app)

@app.route("/graphql", methods=["POST"])
def graphql_server():
    data = request.get_json()
    success, result = graphql_sync(
        schema,
        data,
        context_value=request,
        debug=True
    )
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)