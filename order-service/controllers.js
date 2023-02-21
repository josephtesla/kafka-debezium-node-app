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
  if (await Customer.findById(customerId) == null){
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

exports.getPaymentsAvg = async function (ctx) {
  // some ksqldb calls
  return
}
