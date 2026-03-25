const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

client.connect().then(() =>
  client.query(`SELECT faculty, day, start, "end", type FROM office_hours_entries ORDER BY faculty, day, start`)
).then(res => {
  const grouped = {};
  for (const row of res.rows) {
    if (!grouped[row.faculty]) grouped[row.faculty] = [];
    grouped[row.faculty].push(`  ${row.day}: ${row.start} - ${row.end} (${row.type})`);
  }
  for (const [name, slots] of Object.entries(grouped)) {
    console.log(`\n${name}:`);
    slots.forEach(s => console.log(s));
  }
  client.end();
}).catch(console.error);
