const fs = require('fs');
const path = require('path');
const readline = require('readline');

exports.handler = async (event, context) => {
  const query = event.queryStringParameters.q ? event.queryStringParameters.q.trim().toLowerCase() : '';

  if (!query) {
    return {
      statusCode: 400,
      body: 'Query parameter "q" is required.'
    };
  }

  // path to CSV file
  const csvFilePath = path.join(__dirname, 'final testing2.csv');

  if (!fs.existsSync(csvFilePath)) {
    return {
      statusCode: 500,
      body: 'Data file not found.'
    };
  }

  try {
    const results = [];
    const fileStream = fs.createReadStream(csvFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = [];
    let isHeader = true;

    for await (const line of rl) {
      if (!line.trim()) continue;

      // Simple CSV Splitter
      const row = parseCsvLine(line);

      if (isHeader) {
        headers = row.map(h => h.trim());
        isHeader = false;
        continue;
      }

      if (row.length >= headers.length) {
        const item = {};
        headers.forEach((h, idx) => {
          item[h] = row[idx] ? row[idx].trim() : '';
        });

        // Search in account, station_code, VMY_Code, or subscriber_name
        const acc = (item.account || '').toLowerCase();
        const station = (item.station_code || '').toLowerCase();
        const vmy = (item.custoemr_phone_number || item.phone_no || '').toLowerCase();
        const name = (item.subscriber_name || '').toLowerCase();

        if (acc.includes(query) || station.includes(query) || vmy.includes(query) || name.includes(query)) {
          results.push(item);
        }
      }
    }

    const csvOutput = convertToCSV(results, headers);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: csvOutput
    };

  } catch (error) {
    console.error('Error reading CSV:', error);
    return {
      statusCode: 500,
      body: 'Internal server error'
    };
  }
};

// Line parse helper
function parseCsvLine(line) {
  const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
  const row = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    let val = match[1] !== undefined ? match[1] : match[2];
    row.push(val ? val.trim() : '');
  }
  return row;
}

// Convert JSON array back to CSV response
function convertToCSV(items, originalHeaders) {
  if (!items || items.length === 0) return "";

  // MongoDB / CSV ထဲမှာရှိတဲ့ Column ခေါင်းစဉ်များ (location အပါအဝင်)
  let headers = originalHeaders && originalHeaders.length > 0 ? originalHeaders : [
    "STT", "account", "department", "subscriber_name", "custoemr_phone_number", 
    "address", "location", "device_code", "port_on_card", "port_splitter", "subscriber_node", 
    "cable_length", "ont_serial", "station_code", "branch", "partner_name", 
    "technical_name", "VMY_Code", "technical_phone_number"
  ];

  // ဇယားထဲမှာ location မပါသေးရင် အလိုအလျောက် ပေါင်းထည့်ပေးခြင်း
  if (!headers.includes("location")) {
    headers.push("location");
  }

  const csvRows = [];
  csvRows.push(headers.join(","));

  for (const item of items) {
    const values = headers.map(header => {
      let val = item[header] !== undefined && item[header] !== null ? item[header] : "";
      // Clean newline characters inside text
      val = String(val).replace(/[\r\n]+/g, " ").replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}
