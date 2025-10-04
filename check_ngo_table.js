import { query } from './db.js';

async function checkNGOTable() {
  try {
    const [result] = await query('DESCRIBE ngo_register');
    console.log('NGO Register table structure:');
    if (result[0] && Array.isArray(result[0])) {
      result[0].forEach(row => console.log(row));
    } else {
      console.log('Result structure:', result);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkNGOTable();
