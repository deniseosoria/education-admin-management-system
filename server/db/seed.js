// server/db/seed.js

const pool = require('../config/db');

const seed = async () => {
  try {
    console.log('Starting database seeding...');

    // Clean up old data to prevent duplicates
    console.log('Cleaning up existing data...');
    await pool.query('DELETE FROM historical_enrollments');
    await pool.query('DELETE FROM enrollments');
    await pool.query('DELETE FROM class_waitlist');
    await pool.query('DELETE FROM historical_sessions');
    await pool.query('DELETE FROM class_sessions');
    await pool.query('DELETE FROM certificates');
    await pool.query('DELETE FROM payments');
    await pool.query('DELETE FROM classes');
    console.log('Cleanup complete');

    // Get existing user IDs from database

    // Get existing user IDs from database
    const { rows: existingUsers } = await pool.query(`
      SELECT id, email, role FROM users 
      WHERE email IN ('jane@example.com', 'john@example.com', 'admin@example.com', 'instructor1@example.com', 'instructor2@example.com')
    `);

    const janeId = existingUsers.find(u => u.email === 'jane@example.com')?.id;
    const johnId = existingUsers.find(u => u.email === 'john@example.com')?.id;
    const adminId = existingUsers.find(u => u.email === 'admin@example.com')?.id;
    const instructorOneId = existingUsers.find(u => u.email === 'instructor1@example.com')?.id;
    const instructorTwoId = existingUsers.find(u => u.email === 'instructor2@example.com')?.id;

    if (!janeId || !johnId || !adminId || !instructorOneId || !instructorTwoId) {
      throw new Error('Some required users not found in database');
    }

    console.log('Using existing users from database');

    // Seed classes - Active, Completed, and Test class
    const classes = [
      {
        title: 'Child Development Associate (CDA)',
        description: 'This comprehensive course prepares you for the CDA credential, covering all aspects of early childhood education. This 2-month program runs Monday through Friday from 7:00 PM to 10:00 PM.',
        location_type: 'zoom',
        location_details: 'Online via Zoom',
        price: 299.99,
        recurrence_pattern: {
          frequency: 'weekly',
          interval: 1,
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          endDate: '2025-12-31'
        },
        prerequisites: 'None required',
        materials_needed: 'Computer with internet access, webcam, and microphone',
        image_url: 'https://res.cloudinary.com/dufbdy0z0/image/upload/v1747786188/class-1_mlye6d.jpg'
      },
      {
        title: 'Development and Operations',
        description: 'Master the essential skills needed to run a successful childcare program. Choose between our 2-week evening program (Monday-Friday, 7:00 PM - 10:00 PM) or our 5-day Saturday intensive (9:00 AM - 3:00 PM).',
        location_type: 'in-person',
        location_details: 'Main Training Center, Room 101',
        price: 349.99,
        recurrence_pattern: {
          frequency: 'weekly',
          interval: 1,
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          endDate: '2025-12-31'
        },
        prerequisites: 'Basic childcare experience recommended',
        materials_needed: 'Notebook, laptop (optional)',
        image_url: 'https://res.cloudinary.com/dufbdy0z0/image/upload/v1747786188/class-2_vpqyct.jpg'
      },
      {
        title: 'CPR and First Aid Certification',
        description: 'Essential training for childcare providers. Learn life-saving techniques including CPR, AED use, and first aid procedures. This one-day Saturday program runs from 9:00 AM to 2:00 PM.',
        location_type: 'in-person',
        location_details: 'Training Center, Room 203',
        price: 149.99,
        recurrence_pattern: null,
        prerequisites: 'None required',
        materials_needed: 'Comfortable clothing for practical exercises',
        image_url: 'https://res.cloudinary.com/dufbdy0z0/image/upload/v1747786180/class-3_fealxp.jpg'
      },
      {
        title: 'Test Class - Limited Capacity',
        description: 'This is a test class with limited capacity to demonstrate waitlist functionality. Only one student can enroll.',
        location_type: 'in-person',
        location_details: 'Test Room, Room 99',
        price: 99.99,
        recurrence_pattern: null,
        prerequisites: 'None required',
        materials_needed: 'None',
        image_url: 'https://res.cloudinary.com/dufbdy0z0/image/upload/v1747786180/class-3_fealxp.jpg'
      }
    ];

    // Insert classes
    for (const classData of classes) {
      await pool.query(`
        INSERT INTO classes (
          title, description, price, location_type, location_details, recurrence_pattern, prerequisites, materials_needed, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (title) DO NOTHING
      `, [
        classData.title,
        classData.description,
        classData.price,
        classData.location_type,
        classData.location_details,
        JSON.stringify(classData.recurrence_pattern || null),
        classData.prerequisites,
        classData.materials_needed,
        classData.image_url
      ]);
    }

    console.log('Classes created successfully');

    // Get class IDs for seeding related data
    const { rows: classRows } = await pool.query('SELECT id, title FROM classes');
    const classMap = new Map(classRows.map(c => [c.title, c.id]));

    // Use realistic dates for current timeline (August 2025)
    const reviewedAtTz = new Date('2025-07-15T00:38:08.603Z').toISOString(); // for timestamptz
    const enrolledAtTs = '2025-07-15 00:38:08'; // for timestamp
    const dueDateTz = new Date('2025-07-20T00:00:00.000Z').toISOString(); // for payments due_date (timestamptz)
    const refundedAtTz = new Date('2025-07-25T00:00:00.000Z').toISOString(); // for payments refunded_at (timestamptz)
    const paymentCreatedAtTs = '2025-07-15 00:38:08'; // for payments created_at (timestamp)

    // Get current date to determine past/future
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Calculate dates: past sessions (completed) and future sessions (active)
    const pastDate1 = new Date(now);
    pastDate1.setDate(pastDate1.getDate() - 30); // 30 days ago
    const pastDate1Str = pastDate1.toISOString().split('T')[0];

    const pastDate2 = new Date(now);
    pastDate2.setDate(pastDate2.getDate() - 20); // 20 days ago
    const pastDate2Str = pastDate2.toISOString().split('T')[0];

    const pastEndDate1 = new Date(pastDate1);
    pastEndDate1.setDate(pastEndDate1.getDate() + 4);
    const pastEndDate1Str = pastEndDate1.toISOString().split('T')[0];

    const pastEndDate2 = new Date(pastDate2);
    pastEndDate2.setDate(pastEndDate2.getDate() + 4);
    const pastEndDate2Str = pastEndDate2.toISOString().split('T')[0];

    const futureDate1 = new Date(now);
    futureDate1.setDate(futureDate1.getDate() + 30); // 30 days from now
    const futureDate1Str = futureDate1.toISOString().split('T')[0];

    const futureDate2 = new Date(now);
    futureDate2.setDate(futureDate2.getDate() + 45); // 45 days from now
    const futureDate2Str = futureDate2.toISOString().split('T')[0];

    const futureEndDate1 = new Date(futureDate1);
    futureEndDate1.setDate(futureEndDate1.getDate() + 4);
    const futureEndDate1Str = futureEndDate1.toISOString().split('T')[0];

    const futureEndDate2 = new Date(futureDate2);
    futureEndDate2.setDate(futureEndDate2.getDate() + 4);
    const futureEndDate2Str = futureEndDate2.toISOString().split('T')[0];

    // Seed class sessions with instructors
    await pool.query(`
      INSERT INTO class_sessions (
        class_id, 
        session_date, 
        end_date,
        start_time, 
        end_time, 
        capacity, 
        enrolled_count, 
        min_enrollment, 
        waitlist_enabled, 
        waitlist_capacity, 
        instructor_id, 
        status
      )
      VALUES
        -- Child Development Associate (CDA) - COMPLETED sessions (past dates)
        ($1, $6, $7, '19:00', '22:00', 20, 2, 5, true, 10, $2, 'completed'),
        ($1, $8, $9, '19:00', '22:00', 20, 2, 5, true, 10, $2, 'completed'),
        
        -- Child Development Associate (CDA) - ACTIVE sessions (future dates)
        ($1, $10, $11, '19:00', '22:00', 20, 1, 5, true, 10, $2, 'scheduled'),
        ($1, $12, $13, '19:00', '22:00', 20, 1, 5, true, 10, $2, 'scheduled'),
        
        -- Development and Operations - COMPLETED sessions (past dates)
        ($3, $6, $7, '19:00', '22:00', 15, 2, 5, true, 5, $4, 'completed'),
        ($3, $8, $9, '19:00', '22:00', 15, 1, 5, true, 5, $4, 'completed'),
        
        -- Development and Operations - ACTIVE sessions (future dates)
        ($3, $10, $11, '19:00', '22:00', 15, 1, 5, true, 5, $4, 'scheduled'),
        ($3, $12, $13, '19:00', '22:00', 15, 1, 5, true, 5, $4, 'scheduled'),
        
        -- CPR and First Aid Certification - COMPLETED sessions (past dates)
        ($5, $6, NULL, '09:00', '14:00', 12, 2, 4, true, 8, $2, 'completed'),
        ($5, $8, NULL, '09:00', '14:00', 12, 1, 4, true, 8, $2, 'completed'),
        
        -- CPR and First Aid Certification - ACTIVE sessions (future dates)
        ($5, $10, NULL, '09:00', '14:00', 12, 1, 4, true, 8, $2, 'scheduled'),
        ($5, $12, NULL, '09:00', '14:00', 12, 1, 4, true, 8, $2, 'scheduled'),
        
        -- Test Class - Limited Capacity (1 student) - ACTIVE session
        ($14, $10, NULL, '10:00', '12:00', 1, 1, 1, true, 5, $2, 'scheduled')
      ON CONFLICT DO NOTHING;
    `, [
      classMap.get('Child Development Associate (CDA)'),
      instructorOneId,
      classMap.get('Development and Operations'),
      instructorTwoId,
      classMap.get('CPR and First Aid Certification'),
      pastDate1Str, // $6
      pastEndDate1Str, // $7
      pastDate2Str, // $8
      pastEndDate2Str, // $9
      futureDate1Str, // $10
      futureEndDate1Str, // $11
      futureDate2Str, // $12
      futureEndDate2Str, // $13
      classMap.get('Test Class - Limited Capacity') // $14
    ]);

    console.log('Sessions created successfully');

    // Get completed sessions (for historical enrollments)
    const { rows: completedSessions } = await pool.query(`
      SELECT id, class_id, session_date, end_date
      FROM class_sessions 
      WHERE status = 'completed'
      ORDER BY class_id, session_date
    `);

    // Get active sessions (for active enrollments)
    const { rows: activeSessions } = await pool.query(`
      SELECT id, class_id, session_date, end_date
      FROM class_sessions 
      WHERE status = 'scheduled'
      ORDER BY class_id, session_date
    `);

    console.log(`Found ${completedSessions.length} completed sessions and ${activeSessions.length} active sessions`);

    // Create historical enrollments from completed sessions
    // For each completed session, create enrollments for Jane and John
    for (const session of completedSessions) {
      // Create enrollments for both users
      await pool.query(`
        INSERT INTO enrollments (user_id, class_id, session_id, payment_status, enrollment_status, admin_notes, reviewed_at, reviewed_by, enrolled_at)
        VALUES
          ($1, $2, $3, 'paid', 'approved', 'Completed session', $4, $5, $6),
          ($7, $2, $3, 'paid', 'approved', 'Completed session', $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [
        janeId,
        session.class_id,
        session.id,
        reviewedAtTz,
        adminId,
        enrolledAtTs,
        johnId
      ]);
    }

    // Create active enrollments from active sessions
    // For each active session, create enrollments for Jane and John
    for (const session of activeSessions) {
      // Skip test class - it will have only 1 enrollment (already at capacity)
      const testClassId = classMap.get('Test Class - Limited Capacity');
      if (session.class_id === testClassId) {
        // Only Jane enrolled in test class (at capacity)
        await pool.query(`
          INSERT INTO enrollments (user_id, class_id, session_id, payment_status, enrollment_status, admin_notes, reviewed_at, reviewed_by, enrolled_at)
          VALUES ($1, $2, $3, 'paid', 'approved', 'Active session enrollment', $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          janeId,
          session.class_id,
          session.id,
          reviewedAtTz,
          adminId,
          enrolledAtTs
        ]);
      } else {
        // Create enrollments for both users
        await pool.query(`
          INSERT INTO enrollments (user_id, class_id, session_id, payment_status, enrollment_status, admin_notes, reviewed_at, reviewed_by, enrolled_at)
          VALUES
            ($1, $2, $3, 'paid', 'approved', 'Active session enrollment', $4, $5, $6),
            ($7, $2, $3, 'paid', 'approved', 'Active session enrollment', $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          janeId,
          session.class_id,
          session.id,
          reviewedAtTz,
          adminId,
          enrolledAtTs,
          johnId
        ]);
      }
    }

    console.log('Enrollments created successfully');

    // Then, update user roles for users with approved enrollments
    await pool.query(`
      UPDATE users u
      SET role = 'student'
      WHERE EXISTS (
        SELECT 1 
        FROM enrollments e 
        WHERE e.user_id = u.id 
        AND e.enrollment_status = 'approved'
      )
      AND u.role = 'user'  -- Only update users who are not already instructors or admins
    `);

    // Update enrollment counts in class_sessions based on approved enrollments
    await pool.query(`
      UPDATE class_sessions cs
      SET enrolled_count = (
        SELECT COUNT(*)
        FROM enrollments e
        WHERE e.session_id = cs.id
        AND e.enrollment_status = 'approved'
      )
    `);

    // Seed certificates
    await pool.query(`
      INSERT INTO certificates (
        user_id, 
        class_id, 
        certificate_name, 
        certificate_url, 
        verification_code,
        status,
        uploaded_by
      )
      VALUES
        ($1, $4, 'CDA Certificate', 'https://example.com/certs/cda.pdf', 'CDA-2025-001', 'approved', $3),
        ($1, $5, 'Development and Operations Certificate', 'https://example.com/certs/devops.pdf', 'DO-2025-001', 'approved', $3),
        ($2, $6, 'CPR and First Aid Certificate', 'https://example.com/certs/cpr.pdf', 'CPR-2025-001', 'pending', $3)
      ON CONFLICT (verification_code) DO NOTHING;
    `, [
      janeId, // $1
      johnId, // $2
      adminId, // $3
      classMap.get('Child Development Associate (CDA)'), // $4
      classMap.get('Development and Operations'), // $5
      classMap.get('CPR and First Aid Certification') // $6
    ]);

    // Seed payments
    await pool.query(`
      INSERT INTO payments (
        user_id, 
        class_id, 
        stripe_payment_id, 
        amount, 
        currency, 
        status,
        due_date,
        payment_method,
        last_four,
        refund_status,
        refund_amount,
        refund_reason,
        refunded_at,
        refunded_by,
        created_at
      )
      VALUES
        ($1, $4, 'stripe_payment_1', 299.99, 'USD', 'completed', $7, 'credit_card', '4242', NULL, NULL, NULL, NULL, NULL, $10),
        ($1, $5, 'stripe_payment_2', 349.99, 'USD', 'completed', $8, 'credit_card', '4242', 'processed', 349.99, 'Student requested refund', $9, $3, $10),
        ($2, $6, 'stripe_payment_3', 149.99, 'USD', 'completed', $11, 'credit_card', '5555', NULL, NULL, NULL, NULL, NULL, $10),
        ($2, $4, 'stripe_payment_4', 299.99, 'USD', 'pending', $12, 'credit_card', '5555', NULL, NULL, NULL, NULL, NULL, $10),
        ($1, $6, 'stripe_payment_5', 149.99, 'USD', 'completed', $13, 'credit_card', '4242', 'processed', 74.99, 'Partial refund due to cancellation', $9, $3, $10)
      ON CONFLICT (stripe_payment_id) DO NOTHING;
    `, [
      janeId, // $1
      johnId, // $2
      adminId, // $3
      classMap.get('Child Development Associate (CDA)'), // $4
      classMap.get('Development and Operations'), // $5
      classMap.get('CPR and First Aid Certification'), // $6
      dueDateTz, // $7
      dueDateTz, // $8
      refundedAtTz, // $9
      paymentCreatedAtTs, // $10
      dueDateTz, // $11
      dueDateTz, // $12
      dueDateTz // $13
    ]);

    // Seed waitlist entry for test class (capacity of 1, already full, so John is on waitlist)
    const testClassId = classMap.get('Test Class - Limited Capacity');
    const waitlistDate = new Date().toISOString();

    await pool.query(`
      INSERT INTO class_waitlist (class_id, user_id, position, status, created_at)
      VALUES ($1, $2, 1, 'pending', $3)
      ON CONFLICT (class_id, user_id) DO NOTHING;
    `, [
      testClassId,
      johnId, // John is on waitlist since Jane already enrolled (capacity = 1)
      waitlistDate
    ]);

    console.log('Waitlist created for test class');

    // Seed notification templates
    await pool.query(`
      INSERT INTO notification_templates (name, type, title_template, message_template, metadata)
        VALUES
          (
            'class_reminder',
            'class_notification',
            'Upcoming Class: {{class_name}}',
            'Your class "{{class_name}}" starts in {{time_until}}. Please join at {{location}}.',
            '{"category": "class", "priority": "high"}'::jsonb
          ),
          (
            'enrollment_approved',
            'user_notification',
            'Enrollment Approved: {{class_name}}',
            'Your enrollment in "{{class_name}}" has been approved. The class starts on {{start_date}}.',
            '{"category": "enrollment", "priority": "medium"}'::jsonb
          ),
          (
            'payment_due',
            'user_notification',
            'Payment Due: {{class_name}}',
            'Payment of {{amount}} for "{{class_name}}" is due on {{due_date}}.',
            '{"category": "payment", "priority": "high"}'::jsonb
          ),
          (
            'certificate_ready',
            'user_notification',
            'Certificate Available: {{class_name}}',
            'Your certificate for "{{class_name}}" is now available for download.',
            '{"category": "certificate", "priority": "medium"}'::jsonb
        )
      ON CONFLICT (name) DO NOTHING;
    `);

    // Seed notifications (without sender_id to avoid type conflicts)
    await pool.query(`
      INSERT INTO user_notifications (user_id, type, title, message, is_read, action_url, metadata)
      VALUES
        -- Past session notifications
        ($1::uuid, 'certificate_ready', 'Certificate Available: CDA', 'Your CDA certificate from June session is ready to download', false, '/certificates/1', '{"category": "certificate", "priority": "medium"}'::jsonb),
        ($1::uuid, 'certificate_ready', 'Certificate Available: DevOps', 'Your Development and Operations certificate is ready to download', false, '/certificates/2', '{"category": "certificate", "priority": "medium"}'::jsonb),
        ($2::uuid, 'certificate_ready', 'Certificate Available: CPR', 'Your CPR and First Aid certificate is ready to download', false, '/certificates/3', '{"category": "certificate", "priority": "medium"}'::jsonb),
        
        -- Current session notifications
        ($1::uuid, 'class_reminder', 'Upcoming Class: CDA', 'Your CDA class starts in 1 hour', false, '/classes/1', '{"category": "class", "priority": "high"}'::jsonb),
        ($2::uuid, 'payment_due', 'Payment Due', 'Payment for CPR class is due tomorrow', false, '/payments/3', '{"category": "payment", "priority": "high"}'::jsonb),
        
        -- Future session notifications
        ($1::uuid, 'class_reminder', 'Upcoming Class: CDA (Aug)', 'Your CDA class starts in 3 weeks', false, '/classes/1', '{"category": "class", "priority": "medium"}'::jsonb),
        ($2::uuid, 'enrollment_approved', 'Enrollment Approved: DevOps', 'Your enrollment in Development and Operations has been approved', false, '/classes/2', '{"category": "enrollment", "priority": "medium"}'::jsonb),
        ($2::uuid, 'class_reminder', 'Upcoming Class: CPR (Aug)', 'Your CPR class starts in 4 weeks', false, '/classes/3', '{"category": "class", "priority": "medium"}'::jsonb)
      ON CONFLICT DO NOTHING;
    `, [janeId, johnId]);

    // Seed activity logs
    await pool.query(`
      INSERT INTO user_activity_log (user_id, action, details, created_at)
      VALUES
        ($1::uuid, 'profile_update', '{"updated_fields": ["first_name", "last_name"]}'::jsonb, $3),
        ($1::uuid, 'enrollment', '{"class_id": 1, "class_name": "CDA"}'::jsonb, $3),
        ($2::uuid, 'payment', '{"amount": 149.99, "class_name": "CPR"}'::jsonb, $3)
      ON CONFLICT DO NOTHING;
    `, [janeId, johnId, reviewedAtTz]);

    // --- Move completed enrollments to historical_enrollments ---
    console.log('Moving completed enrollments to historical...');

    // Get all enrollments from completed sessions
    const { rows: completedEnrollments } = await pool.query(`
      SELECT e.*, cs.session_date, cs.end_date, cs.start_time, cs.end_time, cs.capacity, cs.enrolled_count, cs.instructor_id
      FROM enrollments e
      JOIN class_sessions cs ON cs.id = e.session_id
      WHERE cs.status = 'completed'
    `);

    console.log(`Found ${completedEnrollments.length} enrollments from completed sessions`);

    // For each completed session, create a historical_session and move enrollments
    const processedSessions = new Map();

    for (const enrollment of completedEnrollments) {
      let historicalSessionId = processedSessions.get(enrollment.session_id);

      // Create historical session if not already created
      if (!historicalSessionId) {
        const { rows: histSessionRows } = await pool.query(`
          INSERT INTO historical_sessions (
            original_session_id, class_id, session_date, end_date, start_time, end_time, 
            capacity, enrolled_count, instructor_id, status, archived_at, archived_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          enrollment.session_id,
          enrollment.class_id,
          enrollment.session_date,
          enrollment.end_date,
          enrollment.start_time,
          enrollment.end_time,
          enrollment.capacity,
          enrollment.enrolled_count,
          enrollment.instructor_id,
          'completed',
          new Date().toISOString(), // archived_at
          'Session completed successfully'
        ]);
        historicalSessionId = histSessionRows[0].id;
        processedSessions.set(enrollment.session_id, historicalSessionId);
      }

      // Move enrollment to historical_enrollments
      await pool.query(`
        INSERT INTO historical_enrollments (
          original_enrollment_id, user_id, class_id, session_id, historical_session_id,
          payment_status, enrollment_status, admin_notes, reviewed_at, reviewed_by, 
          enrolled_at, archived_at, archived_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        enrollment.id, // original_enrollment_id
        enrollment.user_id,
        enrollment.class_id,
        enrollment.session_id,
        historicalSessionId,
        enrollment.payment_status,
        enrollment.enrollment_status,
        enrollment.admin_notes || 'Completed session',
        enrollment.reviewed_at,
        enrollment.reviewed_by,
        enrollment.enrolled_at,
        new Date().toISOString(), // archived_at
        'Session completed successfully'
      ]);

      // Delete the original enrollment (it's now in historical_enrollments)
      await pool.query('DELETE FROM enrollments WHERE id = $1', [enrollment.id]);
    }

    console.log('Completed enrollments moved to historical successfully');

    console.log('Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('Regular Users:');
    console.log('  jane@example.com / user123');
    console.log('  john@example.com / user123');
    console.log('Admins:');
    console.log('  admin@example.com / admin123');
    console.log('Instructors:');
    console.log('  instructor1@example.com / user123');
    console.log('  instructor2@example.com / user123');

  } catch (err) {
    console.error('Error seeding database:', err);
    throw err;
  } finally {
    await pool.end();
  }
};

// Only run if this file is being run directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error in seed script:', err);
      process.exit(1);
    });
}

module.exports = seed;
