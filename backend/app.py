import os
from flask import Flask, request, jsonify
from ariadne import QueryType, MutationType, make_executable_schema, graphql_sync
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

SHOPIFY_URL = os.getenv("SHOPIFY_URL")
SHOPIFY_TOKEN = os.getenv("SHOPIFY_TOKEN")

type_defs = """
    type Money {
        amount: String
        currencyCode: String
    }

    type LineItem {
        title: String
        quantity: Int
        originalUnitPrice: Money
        productId: String
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

    type Order {
        id: String!
        name: String!
        createdAt: String
        totalPrice: Money
        shipmentStatus: String
        trackingLink: String
        lineItems: [LineItem]
    }

    type OrdersPage {
        orders: [Order!]!
        hasNextPage: Boolean!
        endCursor: String
    }

    type Query {
        customer_ids_by_phone(phone: String!): [String!]!
        customer_details_by_id(customerId: String!): Customer
        orders_by_customer_id(customerId: String!, after: String, search: String): OrdersPage!
    }

    type Mutation {
        update_customer_profile(
            customerId: String!
            firstName: String
            lastName: String
            email: String
            phone: String
        ): Customer
    }
"""

query = QueryType()
mutation = MutationType()

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
def resolve_orders_by_customer_id(_, info, customerId, after=None, search=None):
    numeric_id = customerId.split("/")[-1]
    first = 10
    after_str = f', after: "{after}"' if after else ""
    search_query = f"customer_id:{numeric_id}"
    if search:
        search_query += f" name:{search}"
    orders_query = f"""
    {{
      orders(first: {first}, query: "{search_query}", reverse: true{after_str}) {{
        pageInfo {{
          hasNextPage
          endCursor
        }}
        edges {{
          cursor
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
                  product {{
                    id
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
        data = resp.json().get("data", {}).get("orders", {})
        edges = data.get("edges", [])
        orders = []
        for edge in edges:
            node = edge["node"]
            fulfillments = node.get("fulfillments", [])
            shipment_status = None
            tracking_link = None
            if fulfillments and len(fulfillments) > 0:
                tracking = fulfillments[0].get("trackingInfo", [])
                if tracking and len(tracking) > 0:
                    tracking_link = tracking[0].get("url")
                shipment_status = fulfillments[0].get("status")
            orders.append({
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
                        "originalUnitPrice": li["node"].get("originalUnitPriceSet", {}).get("shopMoney", {}),
                        "productId": li["node"].get("product", {}).get("id") if li["node"].get("product") else None,
                    }
                    for li in node.get("lineItems", {}).get("edges", [])
                ]
            })
        pageInfo = data.get("pageInfo", {})
        return {
            "orders": orders,
            "hasNextPage": pageInfo.get("hasNextPage", False),
            "endCursor": pageInfo.get("endCursor"),
        }
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return {"orders": [], "hasNextPage": False, "endCursor": None}

@mutation.field("update_customer_profile")
def resolve_update_customer_profile(_, info, customerId, firstName=None, lastName=None, email=None, phone=None):
    input_fields = []
    if firstName is not None:
        input_fields.append(f'firstName: "{firstName}"')
    if lastName is not None:
        input_fields.append(f'lastName: "{lastName}"')
    if email is not None:
        input_fields.append(f'email: "{email}"')
    if phone is not None:
        input_fields.append(f'phone: "{phone}"')
    input_str = ", ".join(input_fields)
    mutation_query = f"""
    mutation {{
      customerUpdate(input: {{id: "{customerId}", {input_str}}}) {{
        customer {{
          id
          firstName
          lastName
          email
          phone
          createdAt
          defaultAddress {{
            address1
            address2
            city
            province
            country
            zip
            phone
          }}
        }}
        userErrors {{
          field
          message
        }}
      }}
    }}
    """
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN
    }
    try:
        resp = requests.post(SHOPIFY_URL, headers=headers, json={"query": mutation_query})
        resp.raise_for_status()
        resp_json = resp.json()
        if "errors" in resp_json:
            print("GraphQL errors:", resp_json["errors"])
            return None
        data = resp_json.get("data", {})
        customer_update = data.get("customerUpdate")
        if not customer_update:
            print("Mutation failed or returned no data.")
            return None
        if customer_update.get("userErrors"):
            print("User errors:", customer_update["userErrors"])
            return None
        return customer_update.get("customer")
    except Exception as e:
        print(f"Error updating customer: {e}")
        return None

schema = make_executable_schema(type_defs, [query, mutation])

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