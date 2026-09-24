const { MongoClient } = require('mongodb');

// မိမိ MongoDB Connection String ထည့်ရန်
const MONGODB_URI = "mongodb+srv://zee68627_db_user:wHr3ymUSeZm1Kmqu@cluster0.vhrzrkh.mongodb.net/mytel_ftth_db?retryWrites=true&w=majority";

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

// Data များကို CSV String ပြောင်းပေးသော Helper Function
function convertToCSV(items) {
  if (!items || items.length === 0) return "";
  
  const headers = ["account", "subscriber_name", "custoemr_phone_number", "station_code", "VMY_Code", "technical_name", "address"];
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
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/csv; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const query = event.queryStringParameters.q;
  if (!query) {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'text/plain' },
      body: 'Search query is required'
    };
  }

  try {
    const client = await connectToDatabase(MONGODB_URI);
    const db = client.db('mytel_ftth_db');
    const collection = db.collection('subscribers');

    const results = await collection.find({
      $or: [
        { account: { $regex: query,$options: 'i' } },
        { vmy_code: { $regex: query,$options: 'i' } },
        { station_code: { $regex: query,$options: 'i' } },
        { custoemr_phone_number: { $regex: query,$options: 'i' } },
        { subscriber_name: { $regex: query,$options: 'i' } },
        { VMY_Code: { $regex: query,$options: 'i' } }
      ]
    }).limit(50).toArray();

    const csvString = convertToCSV(results);

    return {
      statusCode: 200,
      headers,
      body: csvString
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'text/plain' },
      body: error.message
    };
  }
};
