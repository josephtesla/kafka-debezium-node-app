const fetch = require("node-fetch");
const { Customer, Order } = require("./models");

exports.createCustomer = async function (ctx) {
  const data = ctx.request.body.customerData;
  const customer = await Customer.create(data);
  ctx.response.body = customer
  return
}

exports.getCustomers = async function (ctx) {
  const customers = await Customer.find();
  ctx.response.body = customers
  return
}

exports.createOrder = async function (ctx) {
  const data = ctx.request.body.orderData;
  const { customerId } = data;
  if (await Customer.findById(customerId) == null) {
    ctx.status = 400;
    ctx.response.body = {
      error: 'customer id does not exist'
    }

    return
  }

  const order = await Order.create(data);
  ctx.response.body = order
  return
}

exports.getOrders = async function (ctx) {
  const orders = await Order.find();
  ctx.response.body = orders
  return
}

exports.getPaymentsBreakdown = async function (ctx) {
  // some ksqldb calls
  const body = {
    "ksql": "select * from payments_breakdown;",
    "streamsProperties": {}
  }

  const response = await fetch('http://localhost:8088/query', {
    method: 'post',
    body: JSON.stringify(body),
    headers: { 
      'Content-Type': 'application/vnd.ksql.v1+json',
      'Accept': 'application/vnd.ksql.v1+json'
    }
  });


  const result = await response.json();

  console.dir({ result }, { depth: null})

  function transform(columns, data) {
    const res = data.filter(entry => !!entry.row).map(entry => {
      const row = {}
      columns.forEach((col, i)=> {
        row[col] = entry.row.columns[i]
      })
      return row
    })
    return res
  }

  const columns = [
    "customerId",
    "customerName",
    "customerPhone",
    "totalMoneySpent",
    "AverageMoneySpent"
  ]

  ctx.response.body = transform(columns, result)
  return
}
