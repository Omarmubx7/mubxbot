const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect().then(() => client.query(
  `SELECT DISTINCT faculty FROM office_hours_entries 
   WHERE day IS NULL OR day = '' OR day = 'NULL'
   OR start IS NULL OR start = '' OR start = 'NULL'
   OR "end" IS NULL OR "end" = '' OR "end" = 'NULL'
   OR email IS NULL OR email = '' OR email = 'NULL'
   OR office IS NULL OR office = '' OR office = 'NULL'
   ORDER BY faculty`
)).then(res => {
  console.log('Found', res.rows.length, 'faculty with missing/null fields:');
  if (res.rows.length === 0) {
    console.log('None found!');
  } else {
    res.rows.forEach(r => console.log(' -', r.faculty));
  }
  client.end();
}).catch(console.error);
