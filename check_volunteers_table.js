import { query } from './db.js';

async function checkVolunteersTable() {
  try {
    const [result] = await query('DESCRIBE volunteers');
    console.log('Volunteers table structure:');
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
checkVolunteersTable();
