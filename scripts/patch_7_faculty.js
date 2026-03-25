const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const corrections = [
  // Dr. Salem Alemaishat
  { faculty: 'Dr. Salem Alemaishat', department: 'Computer Science', email: 'salem.alemaishat@htu.edu.jo', office: 'S-323', day: 'Sunday',    start: '01:00 PM', end: '02:30 PM', type: 'In-Person' },
  { faculty: 'Dr. Salem Alemaishat', department: 'Computer Science', email: 'salem.alemaishat@htu.edu.jo', office: 'S-323', day: 'Wednesday', start: '01:00 PM', end: '02:30 PM', type: 'In-Person' },
  { faculty: 'Dr. Salem Alemaishat', department: 'Computer Science', email: 'salem.alemaishat@htu.edu.jo', office: 'S-323', day: 'Thursday',  start: '02:30 PM', end: '03:00 PM', type: 'In-Person' },

  // Shatha Ali Al hawawsheh
  { faculty: 'Shatha Ali Al hawawsheh', department: 'Computer Science', email: 'shatha.alhawawsheh@htu.edu.jo', office: 'S-213', day: 'Sunday',    start: '11:30 AM', end: '12:30 PM', type: 'In-Person' },
  { faculty: 'Shatha Ali Al hawawsheh', department: 'Computer Science', email: 'shatha.alhawawsheh@htu.edu.jo', office: 'S-213', day: 'Monday',    start: '11:30 AM', end: '01:30 PM', type: 'In-Person' },
  { faculty: 'Shatha Ali Al hawawsheh', department: 'Computer Science', email: 'shatha.alhawawsheh@htu.edu.jo', office: 'S-213', day: 'Wednesday', start: '11:30 AM', end: '12:30 PM', type: 'In-Person' },
  { faculty: 'Shatha Ali Al hawawsheh', department: 'Computer Science', email: 'shatha.alhawawsheh@htu.edu.jo', office: 'S-213', day: 'Thursday',  start: '11:30 AM', end: '01:30 PM', type: 'In-Person' },

  // Elham Mahmoud Derbas
  { faculty: 'Elham Mahmoud Derbas', department: 'cyber security', email: 'Elham.derbas@htu.edu.jo', office: 'S321', day: 'Sunday',    start: '09:00 AM', end: '10:00 AM', type: 'In-Person' },
  { faculty: 'Elham Mahmoud Derbas', department: 'cyber security', email: 'Elham.derbas@htu.edu.jo', office: 'S321', day: 'Wednesday', start: '09:00 AM', end: '10:00 AM', type: 'In-Person' },
  { faculty: 'Elham Mahmoud Derbas', department: 'cyber security', email: 'Elham.derbas@htu.edu.jo', office: 'S321', day: 'Monday',    start: '12:00 PM', end: '01:00 PM', type: 'In-Person' },
  { faculty: 'Elham Mahmoud Derbas', department: 'cyber security', email: 'Elham.derbas@htu.edu.jo', office: 'S321', day: 'Thursday',  start: '12:00 PM', end: '01:00 PM', type: 'In-Person' },

  // Asma Al-Fakhore
  { faculty: 'Asma Al-Fakhore', department: 'Data Science and Artificial Intelligence', email: 'asma.alfakhore@htu.edu.jo', office: 'IJC-04', day: 'Monday',    start: '01:00 PM', end: '02:30 PM', type: 'In-Person' },
  { faculty: 'Asma Al-Fakhore', department: 'Data Science and Artificial Intelligence', email: 'asma.alfakhore@htu.edu.jo', office: 'IJC-04', day: 'Wednesday', start: '02:30 PM', end: '04:00 PM', type: 'In-Person' },
  { faculty: 'Asma Al-Fakhore', department: 'Data Science and Artificial Intelligence', email: 'asma.alfakhore@htu.edu.jo', office: 'IJC-04', day: 'Thursday',  start: '01:00 PM', end: '02:30 PM', type: 'In-Person' },

  // Bassam Kasasbeh
  { faculty: 'Bassam Kasasbeh', department: 'Data Science and Artificial Intelligence', email: 'bassam.alkasasbeh@htu.edu.jo', office: 'S-310', day: 'Saturday',  start: '09:00 AM', end: '10:00 AM', type: 'In-Person' },
  { faculty: 'Bassam Kasasbeh', department: 'Data Science and Artificial Intelligence', email: 'bassam.alkasasbeh@htu.edu.jo', office: 'S-310', day: 'Tuesday',   start: '09:00 AM', end: '10:00 AM', type: 'In-Person' },
  { faculty: 'Bassam Kasasbeh', department: 'Data Science and Artificial Intelligence', email: 'bassam.alkasasbeh@htu.edu.jo', office: 'S-310', day: 'Sunday',    start: '10:00 AM', end: '11:30 AM', type: 'Online (Teams)' },
  { faculty: 'Bassam Kasasbeh', department: 'Data Science and Artificial Intelligence', email: 'bassam.alkasasbeh@htu.edu.jo', office: 'S-310', day: 'Sunday',    start: '02:30 PM', end: '03:30 PM', type: 'In-Person' },
  { faculty: 'Bassam Kasasbeh', department: 'Data Science and Artificial Intelligence', email: 'bassam.alkasasbeh@htu.edu.jo', office: 'S-310', day: 'Wednesday', start: '10:00 AM', end: '11:30 AM', type: 'Online (Teams)' },

  // Sama Hamza
  { faculty: 'Sama Hamza', department: 'Data Science and Artificial Intelligence', email: 'sama.hamza@htu.edu.jo', office: 'S-315', day: 'Saturday',  start: '10:00 AM', end: '11:00 AM', type: 'In-Person' },
  { faculty: 'Sama Hamza', department: 'Data Science and Artificial Intelligence', email: 'sama.hamza@htu.edu.jo', office: 'S-315', day: 'Sunday',    start: '12:00 PM', end: '01:00 PM', type: 'In-Person' },
  { faculty: 'Sama Hamza', department: 'Data Science and Artificial Intelligence', email: 'sama.hamza@htu.edu.jo', office: 'S-315', day: 'Tuesday',   start: '10:00 AM', end: '11:00 AM', type: 'In-Person' },
  { faculty: 'Sama Hamza', department: 'Data Science and Artificial Intelligence', email: 'sama.hamza@htu.edu.jo', office: 'S-315', day: 'Wednesday', start: '12:00 PM', end: '01:00 PM', type: 'In-Person' },

  // Suhaib Ghazi Al-Obeidallah
  { faculty: 'Suhaib Ghazi Al-Obeidallah', department: 'Computer Science', email: 'suhaib.alobeidallah@htu.edu.jo', office: 'W-214', day: 'Saturday',  start: '01:00 PM', end: '02:00 PM', type: 'In-Person' },
  { faculty: 'Suhaib Ghazi Al-Obeidallah', department: 'Computer Science', email: 'suhaib.alobeidallah@htu.edu.jo', office: 'W-214', day: 'Sunday',    start: '10:00 AM', end: '11:00 AM', type: 'In-Person' },
  { faculty: 'Suhaib Ghazi Al-Obeidallah', department: 'Computer Science', email: 'suhaib.alobeidallah@htu.edu.jo', office: 'W-214', day: 'Wednesday', start: '10:00 AM', end: '11:00 AM', type: 'In-Person' },
  { faculty: 'Suhaib Ghazi Al-Obeidallah', department: 'Computer Science', email: 'suhaib.alobeidallah@htu.edu.jo', office: 'W-214', day: 'Thursday',  start: '10:00 AM', end: '11:00 AM', type: 'In-Person' },
];

const NAMES = [...new Set(corrections.map(r => r.faculty))];

client.connect().then(async () => {
  await client.query('BEGIN');
  // Delete old records for all affected faculty
  for (const name of NAMES) {
    await client.query(`DELETE FROM office_hours_entries WHERE faculty = $1`, [name]);
  }
  // Insert corrected records
  for (const r of corrections) {
    await client.query(
      `INSERT INTO office_hours_entries (faculty, department, email, office, day, start, "end", type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r.faculty, r.department, r.email, r.office, r.day, r.start, r.end, r.type]
    );
  }
  await client.query('COMMIT');
  console.log(`Done! Patched ${NAMES.length} faculty, inserted ${corrections.length} slots.`);
  NAMES.forEach(n => console.log(' -', n));
  await client.end();
}).catch(async err => {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Error:', err.message);
  await client.end();
});
