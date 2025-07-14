// Test user oluşturma script'i
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestUser() {
  try {
    console.log('Test user oluşturuluyor...');
    
    // Test user bilgileri
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    };
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    // Kullanıcıyı veritabanına ekle
    const query = `
      INSERT INTO users (first_name, last_name, email, password, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, first_name, last_name, email, role
    `;
    
    const result = await pgPool.query(query, [
      testUser.firstName,
      testUser.lastName,
      testUser.email,
      hashedPassword,
      testUser.role
    ]);
    
    console.log('✅ Test user başarıyla oluşturuldu:');
    console.log('Email:', testUser.email);
    console.log('Password:', testUser.password);
    console.log('User ID:', result.rows[0].id);
    
    // Admin user da oluştur
    const adminUser = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    };
    
    const hashedAdminPassword = await bcrypt.hash(adminUser.password, 10);
    
    const adminResult = await pgPool.query(query, [
      adminUser.firstName,
      adminUser.lastName,
      adminUser.email,
      hashedAdminPassword,
      adminUser.role
    ]);
    
    console.log('\n✅ Admin user başarıyla oluşturuldu:');
    console.log('Email:', adminUser.email);
    console.log('Password:', adminUser.password);
    console.log('User ID:', adminResult.rows[0].id);
    
    // Founder user da oluştur
    const founderUser = {
      firstName: 'Founder',
      lastName: 'User',
      email: 'founder@example.com',
      password: 'founder123',
      role: 'founder'
    };
    
    const hashedFounderPassword = await bcrypt.hash(founderUser.password, 10);
    
    const founderResult = await pgPool.query(query, [
      founderUser.firstName,
      founderUser.lastName,
      founderUser.email,
      hashedFounderPassword,
      founderUser.role
    ]);
    
    console.log('\n✅ Founder user başarıyla oluşturuldu:');
    console.log('Email:', founderUser.email);
    console.log('Password:', founderUser.password);
    console.log('User ID:', founderResult.rows[0].id);
    
    console.log('\n🎉 Tüm test kullanıcıları oluşturuldu!');
    console.log('\nTest kullanıcıları:');
    console.log('1. Normal User:', testUser.email, '/', testUser.password);
    console.log('2. Admin User:', adminUser.email, '/', adminUser.password);
    console.log('3. Founder User:', founderUser.email, '/', founderUser.password);
    
  } catch (error) {
    console.error('❌ Test user oluşturma hatası:', error);
  } finally {
    await pgPool.end();
  }
}

// Script'i çalıştır
createTestUser(); 