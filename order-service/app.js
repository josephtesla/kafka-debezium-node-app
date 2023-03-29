const Koa = require('koa');
const koaBody = require('koa-bodyparser');
const cors = require('@koa/cors');
const KoaRouter = require('koa-router');
const mongoose = require('mongoose');
const { 
  createCustomer, 
  getCustomers, 
  createOrder, 
  getOrders, 
  getPaymentsBreakdown 
} = require('./controllers');
const { Customer } = require('./models');

require('./kafka-setup')

mongoose.connect('mongodb://localhost:27001,localhost:27002,localhost:27003/orderapp?replicaSet=rs0&retryWrites=true', { useUnifiedTopology: true })
  .then(() => console.log("Connected to Mongodb"))
  .catch(err => {
    console.dir(err, { depth: null })
  })

const app = new Koa()

app.use(koaBody())
app.use(cors())

const router = new KoaRouter();

router
  .post('/customers', createCustomer)
  .get('/customers', getCustomers)
  .post('/orders', createOrder)
  .get('/orders', getOrders)
  .get('/payments_breakdown', getPaymentsBreakdown)


app.use(router.routes());
app.use(router.allowedMethods());



const PORT = process.env.PORT || 3010
app.listen(PORT, () => {
  console.log(`Order service started on port ${PORT}`)
})
