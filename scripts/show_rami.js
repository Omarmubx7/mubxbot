const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query(
    `SELECT faculty, department, email, office, day, start, "end", type FROM office_hours_entries WHERE faculty ILIKE '%rami%' ORDER BY day, start`
  ))
  .then(res => {
    if (res.rows.length === 0) { console.log('No records found for Rami'); }
    else {
      const { faculty, department, email, office } = res.rows[0];
      console.log(`Faculty:    ${faculty}`);
      console.log(`Department: ${department}`);
      console.log(`Email:      ${email}`);
      console.log(`Office:     ${office}\n`);
      res.rows.forEach(r => console.log(`  ${r.day}: ${r.start} - ${r.end} (${r.type})`));
    }
    client.end();
  })
  .catch(console.error);
