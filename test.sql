INSERT INTO office_hours_entries (faculty, department, email, office, day, start, "end", type) VALUES
('Shatha Thiabat', 'SCI', 'shatha.thiab@htu.edu.jo', 'W-B05', 'Sunday', '10:00', '11:00', 'In-Person'),
('Shatha Thiabat', 'SCI', 'shatha.thiab@htu.edu.jo', 'W-B05', 'Monday', '10:00', '11:00', 'In-Person'),
('Shatha Thiabat', 'SCI', 'shatha.thiab@htu.edu.jo', 'W-B05', 'Wednesday', '10:00', '11:00', 'In-Person'),
('Shatha Thiabat', 'SCI', 'shatha.thiab@htu.edu.jo', 'W-B05', 'Thursday', '10:00', '11:00', 'In-Person');

    SELECT DISTINCT faculty
    FROM office_hours_entries
    WHERE id::text = 'NULL'
    OR faculty = 'NULL'
    OR department = 'NULL'
    OR email = 'NULL'
    OR office = 'NULL'
    OR day = 'NULL'
    OR start = 'NULL'
    OR "end" = 'NULL'
    OR type = 'NULL'
    OR created_at::text = 'NULL'
    OR updated_at::text = 'NULL';
