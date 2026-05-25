import pool from './db.js';

export const seedDatabase = async () => {
    try {
        console.log('Database Seeder: checking tables...');

        // Align the users table with the profile form before any data access.
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS wilaya_id INT REFERENCES wilayas(id) ON DELETE SET NULL');

        // 1. Check categories
        const catCheck = await pool.query('SELECT COUNT(*) FROM categories');
        const catCount = parseInt(catCheck.rows[0].count, 10);
        
        if (catCount === 0) {
            console.log('Seeding categories...');
            const categories = [
                [1, 'Antibiotiques', 'Médicaments pour traiter les infections bactériennes'],
                [2, 'Cardiovasculaire', 'Médicaments pour le système cardiaque et circulatoire'],
                [3, 'Diabète', 'Traitements pour la régulation de la glycémie et insuline'],
                [4, 'Neurologie', 'Médicaments pour le système nerveux et cerveau'],
                [5, 'Oncologie', 'Traitements contre le cancer et immunothérapies'],
                [6, 'Dermatologie', 'Traitements de la peau'],
                [7, 'Pédiatrie', 'Médicaments adaptés aux enfants'],
                [8, 'Ophtalmologie', 'Traitements pour les yeux'],
                [9, 'Autre', 'Autres types de médicaments']
            ];

            for (const cat of categories) {
                await pool.query(
                    'INSERT INTO categories (id, nom, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
                    cat
                );
            }
            console.log('Categories seeded successfully!');
        }

        // 2. Check wilayas
        const wilayaCheck = await pool.query('SELECT COUNT(*) FROM wilayas');
        const wilayaCount = parseInt(wilayaCheck.rows[0].count, 10);

        if (wilayaCount === 0) {
            console.log('Seeding wilayas...');
            const wilayas = [
                [1, 'Adrar'], [2, 'Chlef'], [3, 'Laghouat'], [4, 'Oum El Bouaghi'], [5, 'Batna'],
                [6, 'Béjaïa'], [7, 'Biskra'], [8, 'Béchar'], [9, 'Blida'], [10, 'Bouira'],
                [11, 'Tamanrasset'], [12, 'Tébessa'], [13, 'Tlemcen'], [14, 'Tiaret'], [15, 'Tizi Ouzou'],
                [16, 'Alger'], [17, 'Djelfa'], [18, 'Jijel'], [19, 'Sétif'], [20, 'Saïda'],
                [21, 'Skikda'], [22, 'Sidi Bel Abbès'], [23, 'Annaba'], [24, 'Guelma'], [25, 'Constantine'],
                [26, 'Médéa'], [27, 'Mostaganem'], [28, "M'Sila"], [29, 'Mascara'], [30, 'Ouargla'],
                [31, 'Oran'], [32, 'El Bayadh'], [33, 'Illizi'], [34, 'Bordj Bou Arreridj'], [35, 'Boumerdès'],
                [36, 'El Tarf'], [37, 'Tindouf'], [38, 'Tissemsilt'], [39, 'El Oued'], [40, 'Khenchela'],
                [41, 'Souk Ahras'], [42, 'Tipaza'], [43, 'Mila'], [44, 'Aïn Defla'], [45, 'Naâma'],
                [46, 'Aïn Témouchent'], [47, 'Ghardaïa'], [48, 'Relizane'], [49, 'Timimoun'], [50, 'Bordj Badji Mokhtar'],
                [51, 'Ouled Djellal'], [52, 'Béni Abbès'], [53, 'In Salah'], [54, 'In Guezzam'], [55, 'Touggourt'],
                [56, 'Djanet'], [57, "El M'Ghair"], [58, 'El Meniaa'], [59, 'Aflou'], [60, 'El Abiodh Sidi Cheikh'],
                [61, 'El Aricha'], [62, 'El Kantara'], [63, 'Barika'], [64, 'Bou Saâda'], [65, 'Bir El Ater'],
                [66, 'Ksar El Boukhari'], [67, 'Ksar Chellala'], [68, 'Aïn Oussera'], [69, 'Messaad']
            ];

            for (const wil of wilayas) {
                await pool.query(
                    'INSERT INTO wilayas (id, nom_fr) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
                    wil
                );
            }
            // Adjust SERIAL sequences for future automatic inserts so they start after the static IDs
            await pool.query("SELECT setval('wilayas_id_seq', (SELECT MAX(id) FROM wilayas))");
            await pool.query("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))");

            console.log('Wilayas seeded successfully!');
        }

    } catch (error) {
        console.error('Database auto-seeder error:', error);
    }
};
