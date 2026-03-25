const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(process.cwd(), 'data', 'office_hours.json');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

client.connect()
  .then(() => client.query(
    `SELECT faculty, department, email, office, day, start, "end" AS end, type
     FROM office_hours_entries
     ORDER BY faculty, day, start`
  ))
  .then(res => {
    const records = res.rows.map(r => ({
      faculty:    r.faculty,
      department: r.department,
      email:      r.email,
      office:     r.office,
      day:        r.day,
      start:      r.start,
      end:        r.end,
      type:       r.type
    }));
    fs.writeFileSync(OUTPUT, JSON.stringify(records, null, 2), 'utf8');
    console.log(`Exported ${records.length} records to ${OUTPUT}`);
    client.end();
  })
  .catch(console.error);
