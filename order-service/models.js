const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  islocal: { type: Boolean, required: true }
}, { timestamps: true })

const orderSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  price: { type: Number, required: true },
  title: { type: String, required: true },
}, { timestamps: true })

const Customer = mongoose.model('Customer', customerSchema)
const Order = mongoose.model('Order', orderSchema)

module.exports = { Customer, Order }
