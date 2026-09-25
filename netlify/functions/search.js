const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://zee68627_db_user:wHr3ymUSeZm1Kmqu@cluster0.rzyhepp.mongodb.net/mytel_ftth_db?retryWrites=true&w=majority";

let cachedClient = null;

async function connectToDatabase(uri) {
  if (cachedClient) return cachedClient;

  const client = await MongoClient.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  cachedClient = client;
  return client;
}

function convertToCSV(items) {
  if (!items || items.length === 0) return "";
  const headers = [
    "account", "subscriber_name", "custoemr_phone_number", "station_code", 
    "VMY_Code", "branch", "partner_name", "device_code", "port_on_card", 
    "port_splitter", "subscriber_node", "cable_length", "ont_serial", 
    "technical_name", "technical_phone_number", "department", "address", "lat_long"
  ];

  const csvRows = [];
  csvRows.push(headers.join(","));

  for (const item of items) {
    const values = headers.map(header => {
      let val = item[header] || item[header.toLowerCase()] || "";
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'text/csv'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const q = event.queryStringParameters ? event.queryStringParameters.q : '';

    if (!q || q.trim() === '') {
      return { statusCode: 200, headers, body: '' };
    }

    const client = await connectToDatabase(MONGODB_URI);
    const db = client.db('mytel_ftth_db');
    const collection = db.collection('subscribers');

    const searchKey = q.trim();
    const exactRegex = new RegExp(`^${searchKey}$`, 'i');
    const partialRegex = new RegExp(searchKey, 'i');

    const mongoQuery = {
      $or: [
        { account: exactRegex },
        { station_code: exactRegex },
        { VMY_Code: exactRegex },
        { vmy_code: exactRegex },
        { custoemr_phone_number: exactRegex }
      ]
    };

    const results = await collection.find(mongoQuery).toArray();
    const csvData = convertToCSV(results);

    return {
      statusCode: 200,
      headers,
      body: csvData
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
