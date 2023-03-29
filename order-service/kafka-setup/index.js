const {
  MongoClient
} = require("mongodb");
const fetch = require('node-fetch')

// Replace the uri string with your connection string.
const uri = 'mongodb://localhost:27001,localhost:27002,localhost:27003/orderapp?replicaSet=rs0&retryWrites=true';
const client = new MongoClient(uri);

const DBZ_ROLE = 'dbz_role'
const DBZ_USER = 'dbz_user'
const DBZ_PWD = 'dbz_pwd'

async function createDBZRole() {
  const configDB = client.db('config');
  const res = await configDB.command({
    rolesInfo: DBZ_ROLE
  })

  if (res.roles.length > 0) {
    console.log("role exists")
    return
  }

  await configDB.command({
    createRole: DBZ_ROLE,
    privileges: [{
      resource: {
        db: "config",
        collection: "system.sessions"
      },
      actions: ["find", "update", "insert", "remove"]
    }],
    roles: [{
      role: "dbOwner",
      db: "config"
    }, {
      role: "dbAdmin",
      db: "config"
    }, {
      role: "readWrite",
      db: "config"
    }]
  })
  console.log("Role added successfully")
}

async function createDBZUser() {
  const admin = client.db('admin');
  const res = await admin.command({
    usersInfo: DBZ_USER
  })

  if (res.users.length > 0) {
    console.log("User exists")
    return
  }

  await admin.addUser(DBZ_USER, DBZ_PWD, {
    "roles": [{
      "role": "root",
      "db": "admin"
    }, {
      "role": "readWrite",
      "db": "orderapp"
    }, {
      "role": DBZ_ROLE,
      "db": "config"
    }]
  })
  console.log('DBZ user created')
}

async function createCollections() {
  const db = client.db('orderapp')
  // await db.createCollection('customers')
  // await db.createCollection('orders')
  console.log("collections creates")
}


async function executeStatement(ksql) {
  const body = {
    ksql,
    streamsProperties: {}
  }

  const response = await fetch('http://localhost:8088/ksql', {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/vnd.ksql.v1+json',
      'Accept': 'application/vnd.ksql.v1+json'
    }
  });

  return await response.json();
}


async function setupKsqlDBConnector() {
  // Before you issue more commands, tell ksqlDB to start all queries from earliest point in each topic:
  await executeStatement("SET 'auto.offset.reset' = 'earliest';");
  
  // Run the source connector to ingest the changes from MongoDB.
  const c = await executeStatement(`CREATE SOURCE CONNECTOR IF NOT EXISTS orderapp_reader WITH (    
      'connector.class' = 'io.debezium.connector.mongodb.MongoDbConnector',    
      'mongodb.hosts' = 'localhost:27001',    
      'mongodb.name' = 'rs0',    
      'mongodb.authsource' = 'admin',    
      'mongodb.user' = '${DBZ_USER}',    
      'mongodb.password' = '${DBZ_PWD}',
      'topic.prefix' = 'tpcapp-',
      'collection.whitelist' = 'orderapp.*',    
      'transforms' = 'unwrap',    
      'transforms.unwrap.type' = 'io.debezium.connector.mongodb.transforms.ExtractNewDocumentState',    
      'transforms.unwrap.drop.tombstones' = 'false',    
      'transforms.unwrap.delete.handling.mode' = 'drop',    
      'transforms.unwrap.operation.header' = 'true',    
      'tombstones.on.delete' = 'true'
    );
  `)

  console.log(c)
  console.log("ksQL debezium connect completed")
  console.dir(await executeStatement('SHOW TOPICS;'), { depth: null })
}

async function setupTables() {
  console.log(await executeStatement(`
    CREATE STREAM IF NOT EXISTS orders WITH (kafka_topic = 'tpcapp-.orderapp.orders', value_format = 'avro');
  `))

  console.log(await executeStatement(`
    CREATE STREAM IF NOT EXISTS customers WITH (kafka_topic = 'tpcapp-.orderapp.customers', value_format = 'avro');
  `))

  console.log(await executeStatement(`
    CREATE TABLE IF NOT EXISTS customers_by_key AS    
      SELECT _id as id,      
      latest_by_offset(name) AS name,      
      latest_by_offset(phone) AS phone,	
      latest_by_offset(email) AS email,	
      latest_by_offset(isLocal) AS isLocal,	
      latest_by_offset(createdAt) AS createdAt,	
      latest_by_offset(updatedAt) AS updatedAt    
      FROM customers    
      GROUP BY _id    
      EMIT CHANGES;
  `))

  console.log(await executeStatement(`
    CREATE TABLE IF NOT EXISTS orders_by_key AS    
      SELECT _id as id,      
      latest_by_offset(customerId) AS customerId,      
      latest_by_offset(price) AS price,      
      latest_by_offset(title) AS title,	
      latest_by_offset(createdAt) AS createdAt,	
      latest_by_offset(updatedAt) AS updatedAt    
      FROM orders    
      GROUP BY _id    
      EMIT CHANGES;
  `))

  console.log(await executeStatement(`
    CREATE TABLE IF NOT EXISTS payments_breakdown
    WITH (KEY_FORMAT='JSON') AS
    SELECT	o.customerid AS customer_id,	
      c.name AS customer_name,	
      c.phone AS customer_phone,	
      SUM(o.price) AS total_money_spent,	
      AVG(o.price) AS average_money_spent	
      FROM orders_by_key AS o	
      LEFT JOIN customers_by_key c	
      ON o.customerid = c.id	
      GROUP BY o.customerid, c.name, c.phone	
      EMIT CHANGES;
  `))
}


async function run() {
  console.log("Starting Setup")
  createDBZRole()
    .then(createDBZUser)
    .then(createCollections)
    .then(() => console.log("MongoDB Debezium Config Done!"))
    .then(setupKsqlDBConnector)
    .then(setupTables)
    .catch(err => {
      throw err
    })
}

run().catch(console.dir);
