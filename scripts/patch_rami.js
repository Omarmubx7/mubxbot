const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
client.connect().then(async () => {
  await client.query(`DELETE FROM office_hours_entries WHERE faculty = 'Dr. Rami Al-Ouran'`);
  const days = ['Saturday', 'Sunday', 'Wednesday', 'Tuesday'];
  for (const day of days) {
    await client.query(
      `INSERT INTO office_hours_entries (faculty, department, email, office, day, start, "end", type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['Dr. Rami Al-Ouran', 'Data Science and AI', 'rami.alouran@htu.edu.jo', 'S-314', day, '11:30 AM', '12:30 PM', 'In-Person']
    );
  }
  console.log('Done! Updated Dr. Rami Al-Ouran: Sat/Sun/Tue/Wed 11:30-12:30');
  client.end();
}).catch(console.error);
