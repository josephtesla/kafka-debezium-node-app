const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String },
  phone: { type: String },
  email: { type: String }
}, { timestamps: true })

const orderSchema = new mongoose.Schema({
  customerId: { type: String },
  price: { type: Number },
  title: { type: String },
}, { timestamps: true })

const Customer = mongoose.model('Customer', customerSchema)
const Order = mongoose.model('Order', orderSchema)

module.exports = { Customer, Order }
