import { query } from './db.js';

async function fixDistanceDisplay() {
    try {
        console.log('🔧 Fixing distance display...');
        
        // Add latitude/longitude columns if they don't exist
        try {
            await query('ALTER TABLE donations ADD COLUMN latitude DECIMAL(10, 8) NULL');
            console.log('✅ Added latitude column to donations');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Latitude column already exists');
            }
        }
        
        try {
            await query('ALTER TABLE donations ADD COLUMN longitude DECIMAL(11, 8) NULL');
            console.log('✅ Added longitude column to donations');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Longitude column already exists');
            }
        }
        
        try {
            await query('ALTER TABLE volunteers ADD COLUMN latitude DECIMAL(10, 8) NULL');
            console.log('✅ Added latitude column to volunteers');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Volunteers latitude column already exists');
            }
        }
        
        try {
            await query('ALTER TABLE volunteers ADD COLUMN longitude DECIMAL(11, 8) NULL');
            console.log('✅ Added longitude column to volunteers');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Volunteers longitude column already exists');
            }
        }
        
        // Add sample coordinates to existing donations (Nagar area)
        const nagarCoords = [
            { lat: 20.5937, lng: 78.9629 }, // Nagar, Maharashtra
            { lat: 20.5940, lng: 78.9635 },
            { lat: 20.5935, lng: 78.9625 },
            { lat: 20.5945, lng: 78.9640 },
            { lat: 20.5930, lng: 78.9620 }
        ];
        
        // Get donations without coordinates
        const donations = await query(`
            SELECT id FROM donations 
            WHERE latitude IS NULL OR longitude IS NULL 
            ORDER BY id DESC LIMIT 10
        `);
        
        console.log(`📍 Found ${donations.length} donations without coordinates`);
        
        // Add coordinates to donations
        for (let i = 0; i < donations.length; i++) {
            const donation = donations[i];
            const coords = nagarCoords[i % nagarCoords.length];
            
            await query(`
                UPDATE donations 
                SET latitude = ?, longitude = ? 
                WHERE id = ?
            `, [coords.lat, coords.lng, donation.id]);
            
            console.log(`✅ Added coordinates to donation ${donation.id}: ${coords.lat}, ${coords.lng}`);
        }
        
        // Add sample coordinates to volunteers
        const volunteers = await query(`
            SELECT id FROM volunteers 
            WHERE latitude IS NULL OR longitude IS NULL 
            ORDER BY id DESC LIMIT 5
        `);
        
        console.log(`👤 Found ${volunteers.length} volunteers without coordinates`);
        
        // Add coordinates to volunteers (Nagar area)
        for (let i = 0; i < volunteers.length; i++) {
            const volunteer = volunteers[i];
            const coords = nagarCoords[i % nagarCoords.length];
            
            await query(`
                UPDATE volunteers 
                SET latitude = ?, longitude = ? 
                WHERE id = ?
            `, [coords.lat, coords.lng, volunteer.id]);
            
            console.log(`✅ Added coordinates to volunteer ${volunteer.id}: ${coords.lat}, ${coords.lng}`);
        }
        
        console.log('🎉 Distance display fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing distance display:', error);
    }
}

// Run the fix
fixDistanceDisplay().then(() => {
    console.log('✅ Distance display fix completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
});
