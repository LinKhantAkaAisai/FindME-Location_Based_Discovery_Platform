require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- ENVIRONMENT VALIDATION (Anti-theft: server won't start without secrets) ---
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'API_BASE_URL'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '═══════════════════════════════════════════════');
    console.error('\x1b[31m%s\x1b[0m', '  FATAL: Missing required environment variables');
    console.error('\x1b[31m%s\x1b[0m', '  ' + missingEnv.join(', '));
    console.error('\x1b[31m%s\x1b[0m', '  Create a .env file with the required values.');
    console.error('\x1b[31m%s\x1b[0m', '═══════════════════════════════════════════════');
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Token invalid or expired' });

        console.log("Extracted User ID from Token:", decoded.id);
        req.user = decoded;
        next();
    });
};

// --- 2. FILE STORAGE CONFIG ---
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));

// --- 3. DATABASE CONNECTION ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect((err) => {
    if (err) console.error('❌ Database connection failed:', err.stack);
    else console.log('✅ Connected to PostgreSQL Database');
});

// --- 4. AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, phone_number, role = "Consumer" } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password_hash, phone_number, role) VALUES ($1, $2, $3, $4, $5)',
            [username, email, hashedPassword, phone_number, role]
        );
        res.json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

        console.log(`Login Success: ${user.username} (ID: ${user.user_id}, Role: ${user.role})`);
        res.json({ token, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// --- 5. SHOP ROUTES ---

// Get shops owned or managed by the current user
app.get('/api/my-shops', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT s.shop_id, s.name, s.category, s.business_valid, s.plan_type, s.location_latitude as lat, s.location_longitude as lon, 
                CASE WHEN s.owner_id = $1 THEN 'owner' ELSE 'admin' END as user_role
             FROM shops s
             LEFT JOIN shop_admins sa ON s.shop_id = sa.shop_id
             WHERE s.owner_id = $1 OR sa.user_id = $1
             ORDER BY s.shop_id ASC`,
            [userId]
        );
        res.json({ shops: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update shop details (for standard shop owners)
app.put('/api/update-shop/:id', authenticateToken, upload.single('logo'), async (req, res) => {
    const userId = req.user.id;
    const shopId = req.params.id;
    const { name, description, category, address, phone_number, opening_hours } = req.body;
    const logoFile = req.file;

    try {
        // Verify ownership
        const ownerCheck = await pool.query('SELECT owner_id, business_valid, plan_type FROM shops WHERE shop_id = $1', [shopId]);
        if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shop = ownerCheck.rows[0];
        if (shop.owner_id !== userId) return res.status(403).json({ error: 'Not authorized' });

        const hoursJson = opening_hours ? JSON.stringify({ display: opening_hours }) : null;
        let logoUrl = null;

        // Only premium shops can have a logo
        if (logoFile && shop.plan_type === 'premium' && shop.business_valid) {
            logoUrl = `/uploads/${logoFile.filename}`;
        }

        await pool.query(
            `UPDATE shops SET 
                name = $1, 
                description = $2, 
                category = $3, 
                address = $4, 
                phone_number = $5, 
                opening_hours = COALESCE($6, opening_hours),
                logo_url = COALESCE($7, logo_url),
                updated_at = NOW()
             WHERE shop_id = $8`,
            [name, description, category, address, phone_number, hoursJson, logoUrl, shopId]
        );

        res.json({ message: 'Shop updated successfully!' });
    } catch (err) {
        console.error('Update shop error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- DEV ROUTES (for Developer View) ---
app.get('/api/dev/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT user_id, username, email, password_hash, phone_number, role, created_at FROM users ORDER BY user_id ASC'
        );
        res.json({ users: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/dev/stats', async (req, res) => {
    try {
        const users = await pool.query('SELECT COUNT(*) as count FROM users');
        const shops = await pool.query('SELECT COUNT(*) as count FROM shops');
        const posts = await pool.query('SELECT COUNT(*) as count FROM posts');
        const premiumShops = await pool.query("SELECT COUNT(*) as count FROM shops WHERE business_valid = true");
        res.json({
            users: parseInt(users.rows[0].count),
            shops: parseInt(shops.rows[0].count),
            posts: parseInt(posts.rows[0].count),
            premiumShops: parseInt(premiumShops.rows[0].count),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dev/latest-inserts', async (req, res) => {
    try {
        const users = await pool.query('SELECT * FROM users ORDER BY user_id DESC LIMIT 10');
        const shops = await pool.query('SELECT * FROM shops ORDER BY shop_id DESC LIMIT 10');
        const posts = await pool.query('SELECT * FROM posts ORDER BY post_id DESC LIMIT 10');
        const payments = await pool.query('SELECT * FROM payments ORDER BY payment_id DESC LIMIT 10');

        res.json({
            users: users.rows,
            shops: shops.rows,
            posts: posts.rows,
            payments: payments.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/shops', async (req, res) => {
    const { q } = req.query;
    try {
        let query = 'SELECT *, location_latitude as lat, location_longitude as lon FROM shops';
        let params = [];
        if (q) {
            query += ' WHERE name ILIKE $1 OR category ILIKE $1 OR address ILIKE $1';
            params.push(`%${q}%`);
        }
        query += ' ORDER BY shop_id ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/shops/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT *, location_latitude as lat, location_longitude as lon FROM shops WHERE shop_id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        const shop = result.rows[0];

        // Standard shops are always active. Premium shops must be "validated" (approved).
        if (shop.plan_type === 'premium' && !shop.business_valid) {
            return res.status(403).json({ error: 'Shop inactive' });
        }

        res.json(shop);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// --- 6. CREATE POST ROUTE ---
app.post('/api/posts/create', authenticateToken, upload.array('photos', 10), async (req, res) => {
    const userId = req.user.id;
    const { content, shopId, hashtags, isOfficial } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Determine if posting as owner or admin
        let postedByAdminId = null;
        if (shopId) {
            const shopCheck = await client.query('SELECT owner_id FROM shops WHERE shop_id = $1', [shopId]);
            if (shopCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Shop not found' });
            }

            const isOwner = shopCheck.rows[0].owner_id === userId;
            const adminCheck = await client.query('SELECT 1 FROM shop_admins WHERE shop_id = $1 AND user_id = $2', [shopId, userId]);
            const isAdmin = adminCheck.rows.length > 0;

            // Only enforce owner/admin check if this is an OFFICIAL post for the shop
            if (isOfficial === 'true' || isOfficial === true) {
                if (!isOwner && !isAdmin) {
                    await client.query('ROLLBACK');
                    return res.status(403).json({ error: 'Not authorized to post an official update for this shop' });
                }

                if (isAdmin && !isOwner) {
                    postedByAdminId = userId;
                }
            }
        }

        const postResult = await client.query(
            'INSERT INTO posts (user_id, shop_id, content, created_at, is_official, posted_by_admin_id) VALUES ($1, $2, $3, NOW(), $4, $5) RETURNING post_id',
            [userId, shopId || null, content, (isOfficial === 'true' || isOfficial === true), postedByAdminId]
        );
        const newPostId = postResult.rows[0].post_id;

        if (req.files && req.files.length > 0) {
            const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
            for (const file of req.files) {
                const photoUrl = `${apiBaseUrl}/uploads/${file.filename}`;
                await client.query('INSERT INTO post_photos (post_id, photo_url) VALUES ($1, $2)', [newPostId, photoUrl]);
            }
        }

        // Insert hashtags
        if (hashtags) {
            const tagList = hashtags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
            for (const tag of tagList) {
                await client.query('INSERT INTO post_tags (post_id, tag) VALUES ($1, $2)', [newPostId, tag]);
            }
        }

        // Extract and insert @mentions from content
        if (content) {
            const mentions = content.match(/@(\w+)/g);
            if (mentions) {
                for (const mention of mentions) {
                    const username = mention.substring(1);
                    const userResult = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
                    if (userResult.rows.length > 0) {
                        await client.query('INSERT INTO post_mentions (post_id, mentioned_user_id) VALUES ($1, $2)', [newPostId, userResult.rows[0].user_id]);
                    }
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Post created successfully!', postId: newPostId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create post error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- 7. POSTS FEED ROUTE (Enhanced) ---
app.get('/api/posts', async (req, res) => {
    const { category, tag, sort, q } = req.query;
    // Try to get user ID for personalized data (is_reacted, is_bookmarked)
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            currentUserId = decoded.id;
        } catch (e) { }
    }

    try {
        let query = `
            SELECT 
                p.post_id, p.content, p.created_at, p.shop_id, u.username, up.avatar_url,
                COALESCE(s.name, '') as shop_name,
                COALESCE(s.category, '') as shop_category,
                COALESCE(s.logo_url, '') as shop_logo_url,
                COALESCE(s.name, u.username) as location,
                CASE WHEN p.is_official THEN 'shop' ELSE 'user' END as post_type,
                p.is_official,
                COALESCE((SELECT json_agg(ph.photo_url) FROM post_photos ph WHERE ph.post_id = p.post_id), '[]'::json) as photos,
                COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.post_id), 0)::int as reaction_count,
                COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id), 0)::int as comment_count,
                COALESCE((SELECT json_agg(pt.tag) FROM post_tags pt WHERE pt.post_id = p.post_id), '[]'::json) as tags
                ${currentUserId ? `,
                EXISTS(SELECT 1 FROM post_reactions pr WHERE pr.post_id = p.post_id AND pr.user_id = ${currentUserId}) as is_reacted,
                EXISTS(SELECT 1 FROM post_bookmarks pb WHERE pb.post_id = p.post_id AND pb.user_id = ${currentUserId}) as is_bookmarked,
                EXISTS(SELECT 1 FROM shop_follows sf WHERE sf.shop_id = p.shop_id AND sf.user_id = ${currentUserId}) as is_followed
                ` : ', false as is_reacted, false as is_bookmarked, false as is_followed'}
            FROM posts p
            LEFT JOIN shops s ON p.shop_id = s.shop_id
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE (1=1)
        `;

        if (category) {
            query += ` AND s.category = '${category}'`;
        }
        if (tag) {
            query += ` AND p.post_id IN (SELECT post_id FROM post_tags WHERE tag = '${tag}')`;
        }
        if (q) {
            query += ` AND (p.content ILIKE '%${q}%' OR s.name ILIKE '%${q}%' OR u.username ILIKE '%${q}%')`;
        }

        // Apply fallback conditions if no filters are active (original logic)
        if (!category && !tag && !q) {
            query += ` AND ((p.shop_id IS NOT NULL) 
               OR (EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.post_id))
               OR (EXISTS (SELECT 1 FROM post_mentions pm WHERE pm.post_id = p.post_id)))`;
        }

        if (sort === 'popular') {
            query += ` ORDER BY reaction_count DESC, p.created_at DESC`;
        } else if (currentUserId) {
            query += ` ORDER BY (CASE WHEN EXISTS(SELECT 1 FROM shop_follows sf WHERE sf.shop_id = p.shop_id AND sf.user_id = ${currentUserId}) THEN 0 ELSE 1 END), p.created_at DESC`;
        } else {
            query += ` ORDER BY p.created_at DESC`;
        }

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Feed error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 7a. TOGGLE REACTION ---
app.post('/api/posts/:id/react', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const postId = req.params.id;
    try {
        const existing = await pool.query(
            'SELECT reaction_id FROM post_reactions WHERE post_id = $1 AND user_id = $2',
            [postId, userId]
        );
        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2', [postId, userId]);
            const count = await pool.query('SELECT COUNT(*) as count FROM post_reactions WHERE post_id = $1', [postId]);
            res.json({ reacted: false, reaction_count: parseInt(count.rows[0].count) });
        } else {
            await pool.query('INSERT INTO post_reactions (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
            const count = await pool.query('SELECT COUNT(*) as count FROM post_reactions WHERE post_id = $1', [postId]);
            res.json({ reacted: true, reaction_count: parseInt(count.rows[0].count) });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7b. TOGGLE POST BOOKMARK ---
app.post('/api/posts/:id/bookmark', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const postId = req.params.id;
    try {
        // PREVENT SELF-BOOKMARKING
        const postCheck = await pool.query('SELECT user_id FROM posts WHERE post_id = $1', [postId]);
        if (postCheck.rows.length > 0 && postCheck.rows[0].user_id === userId) {
            return res.status(400).json({ error: "You cannot bookmark your own post" });
        }

        const existing = await pool.query(
            'SELECT id FROM post_bookmarks WHERE post_id = $1 AND user_id = $2',
            [postId, userId]
        );
        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM post_bookmarks WHERE post_id = $1 AND user_id = $2', [postId, userId]);
            res.json({ bookmarked: false });
        } else {
            await pool.query('INSERT INTO post_bookmarks (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
            res.json({ bookmarked: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7c. GET BOOKMARKED POSTS ---
app.get('/api/posts/bookmarked', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT p.post_id, p.content, p.created_at, u.username, up.avatar_url,
                COALESCE(s.name, u.username) as location,
                COALESCE((SELECT json_agg(ph.photo_url) FROM post_photos ph WHERE ph.post_id = p.post_id), '[]'::json) as photos,
                COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.post_id), 0)::int as reaction_count,
                COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id), 0)::int as comment_count,
                true as is_bookmarked
            FROM post_bookmarks pb
            JOIN posts p ON pb.post_id = p.post_id
            LEFT JOIN shops s ON p.shop_id = s.shop_id
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE pb.user_id = $1
            ORDER BY pb.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7d. SHOP POSTS (for dashboard and profile) ---
app.get('/api/shop-posts/:shopId', authenticateToken, async (req, res) => {
    const shopId = req.params.shopId;
    const userId = req.user.id;
    try {
        // Check if user is owner or admin to see admin tags
        const accessCheck = await pool.query(
            'SELECT 1 FROM shops WHERE shop_id = $1 AND owner_id = $2 UNION SELECT 1 FROM shop_admins WHERE shop_id = $1 AND user_id = $2',
            [shopId, userId]
        );
        const hasPrivateAccess = accessCheck.rows.length > 0;

        const result = await pool.query(`
            SELECT p.post_id, p.content, p.created_at,
                ${hasPrivateAccess ? 'u.username as posted_by_admin_name,' : ''}
                COALESCE((SELECT json_agg(ph.photo_url) FROM post_photos ph WHERE ph.post_id = p.post_id), '[]'::json) as photos,
                COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.post_id), 0)::int as reaction_count,
                COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id), 0)::int as comment_count
            FROM posts p
            LEFT JOIN users u ON p.posted_by_admin_id = u.user_id
            WHERE p.shop_id = $1 AND p.is_official = true
            ORDER BY p.created_at DESC
        `, [shopId]);
        res.json({ posts: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7g. POST COMMENTS ---
app.get('/api/posts/:id/comments', async (req, res) => {
    const postId = req.params.id;
    try {
        const result = await pool.query(`
            SELECT pc.comment_id, pc.content, pc.created_at, u.username, up.avatar_url
            FROM post_comments pc
            JOIN users u ON pc.user_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE pc.post_id = $1
            ORDER BY pc.created_at ASC
        `, [postId]);
        res.json({ comments: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/:id/comments', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const postId = req.params.id;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment content is required' });

    try {
        const result = await pool.query(
            'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING comment_id, created_at',
            [postId, userId, content]
        );
        res.json({ message: 'Comment added', commentId: result.rows[0].comment_id, created_at: result.rows[0].created_at });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7f. SHOP COMMUNITY POSTS (user posts tagging/mentioning the shop) ---
app.get('/api/shop-posts/:shopId/community', async (req, res) => {
    const shopId = req.params.shopId;
    try {
        // Find shop name first to check for tags/mentions
        const shopResult = await pool.query('SELECT name FROM shops WHERE shop_id = $1', [shopId]);
        if (shopResult.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        const shopName = shopResult.rows[0].name.toLowerCase();

        const result = await pool.query(`
            SELECT 
                p.post_id, p.content, p.created_at, u.username, up.avatar_url,
                COALESCE((SELECT json_agg(ph.photo_url) FROM post_photos ph WHERE ph.post_id = p.post_id), '[]'::json) as photos,
                COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.post_id), 0)::int as reaction_count,
                COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id), 0)::int as comment_count
            FROM posts p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN user_profiles up ON u.user_id = up.user_id
            WHERE p.is_official = false  -- Show community posts (from users)
            AND (
                p.shop_id = $1  -- Explicitly tagged via shop selection
                OR EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.post_id AND pt.tag = $2)
                OR p.content ILIKE $3
            )
            ORDER BY p.created_at DESC
        `, [shopId, shopName, `%@${shopName}%`]);

        res.json({ posts: result.rows });
    } catch (err) {
        console.error('Community posts error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- SHOP FOLLOW ROUTES ---
app.post('/api/shops/:id/follow', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const shopId = req.params.id;
    try {
        const existing = await pool.query(
            'SELECT id FROM shop_follows WHERE user_id = $1 AND shop_id = $2',
            [userId, shopId]
        );
        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM shop_follows WHERE user_id = $1 AND shop_id = $2', [userId, shopId]);
            const count = await pool.query('SELECT COUNT(*) as count FROM shop_follows WHERE shop_id = $1', [shopId]);
            res.json({ following: false, follower_count: parseInt(count.rows[0].count) });
        } else {
            await pool.query('INSERT INTO shop_follows (user_id, shop_id) VALUES ($1, $2)', [userId, shopId]);
            const count = await pool.query('SELECT COUNT(*) as count FROM shop_follows WHERE shop_id = $1', [shopId]);
            res.json({ following: true, follower_count: parseInt(count.rows[0].count) });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/shops/:id/follow-status', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const shopId = req.params.id;
    try {
        const following = await pool.query(
            'SELECT id FROM shop_follows WHERE user_id = $1 AND shop_id = $2',
            [userId, shopId]
        );
        const count = await pool.query('SELECT COUNT(*) as count FROM shop_follows WHERE shop_id = $1', [shopId]);
        res.json({
            following: following.rows.length > 0,
            follower_count: parseInt(count.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/my-followed-shops', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT s.shop_id, s.name, s.category, s.logo_url
            FROM shop_follows sf
            JOIN shops s ON sf.shop_id = s.shop_id
            WHERE sf.user_id = $1
            ORDER BY sf.created_at DESC
        `, [userId]);
        res.json({ shops: result.rows, count: result.rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SHOP ADMIN ROUTES ---

app.post('/api/shop-admin/invite', authenticateToken, async (req, res) => {
    const ownerId = req.user.id;
    const { shopId, invitedUserId } = req.body;

    try {
        // 1. Verify ownership
        const shopCheck = await pool.query('SELECT owner_id FROM shops WHERE shop_id = $1', [shopId]);
        if (shopCheck.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        if (shopCheck.rows[0].owner_id !== ownerId) return res.status(403).json({ error: 'Not authorized' });

        // 2. Verify invited user exists
        const userResult = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [invitedUserId]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        if (invitedUserId === ownerId) return res.status(400).json({ error: 'You cannot invite yourself' });

        // 3. Check existing admin or invitation
        const existingAdmin = await pool.query('SELECT 1 FROM shop_admins WHERE shop_id = $1 AND user_id = $2', [shopId, invitedUserId]);
        if (existingAdmin.rows.length > 0) return res.status(400).json({ error: 'User is already an admin' });

        const existingInvite = await pool.query(
            "SELECT 1 FROM shop_admin_invitations WHERE shop_id = $1 AND invited_user_id = $2 AND status = 'Pending' AND expires_at > NOW()",
            [shopId, invitedUserId]
        );
        if (existingInvite.rows.length > 0) return res.status(400).json({ error: 'An active invitation already exists' });

        // 4. Check max 5 admins limit
        const adminCount = await pool.query('SELECT COUNT(*) as count FROM shop_admins WHERE shop_id = $1', [shopId]);
        if (parseInt(adminCount.rows[0].count) >= 5) return res.status(400).json({ error: 'Maximum limit of 5 administrators reached' });

        // 5. Create invitation
        await pool.query(
            'INSERT INTO shop_admin_invitations (shop_id, invited_user_id, invited_by) VALUES ($1, $2, $3)',
            [shopId, invitedUserId, ownerId]
        );

        res.json({ message: 'Invitation sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/shop-admin/:shopId/list', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { shopId } = req.params;

    try {
        // Verify user is owner or admin
        const accessCheck = await pool.query(
            'SELECT 1 FROM shops WHERE shop_id = $1 AND owner_id = $2 UNION SELECT 1 FROM shop_admins WHERE shop_id = $1 AND user_id = $2',
            [shopId, userId]
        );
        if (accessCheck.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

        const admins = await pool.query(`
            SELECT sa.user_id, u.username, sa.created_at 
            FROM shop_admins sa
            JOIN users u ON sa.user_id = u.user_id
            WHERE sa.shop_id = $1
            ORDER BY sa.created_at ASC
        `, [shopId]);

        const pendingInvites = await pool.query(`
            SELECT sai.invitation_id, u.username, sai.created_at, sai.expires_at
            FROM shop_admin_invitations sai
            JOIN users u ON sai.invited_user_id = u.user_id
            WHERE sai.shop_id = $1 AND sai.status = 'Pending' AND sai.expires_at > NOW()
            ORDER BY sai.created_at ASC
        `, [shopId]);

        res.json({ admins: admins.rows, pendingInvites: pendingInvites.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/shop-admin/:shopId/remove/:userId', authenticateToken, async (req, res) => {
    const ownerId = req.user.id;
    const { shopId, userId } = req.params;

    try {
        const shopCheck = await pool.query('SELECT owner_id FROM shops WHERE shop_id = $1', [shopId]);
        if (shopCheck.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
        if (shopCheck.rows[0].owner_id !== ownerId) return res.status(403).json({ error: 'Only the owner can remove admins' });

        await pool.query('DELETE FROM shop_admins WHERE shop_id = $1 AND user_id = $2', [shopId, userId]);
        res.json({ message: 'Administrator removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        // Get last check time
        const userRes = await pool.query('SELECT last_notification_check FROM users WHERE user_id = $1', [userId]);
        const lastCheck = userRes.rows[0]?.last_notification_check || '1970-01-01 00:00:00';

        const query = `
            SELECT 
                'invitation' as type,
                sai.invitation_id as id,
                s.name as shop_name,
                sai.shop_id as shop_id,
                u.username as actor_name,
                NULL as post_id,
                'You''ve been invited as an administrator.' as message,
                sai.created_at,
                sai.expires_at
            FROM shop_admin_invitations sai
            JOIN shops s ON sai.shop_id = s.shop_id
            JOIN users u ON sai.invited_by = u.user_id
            WHERE sai.invited_user_id = $1 AND sai.status = 'Pending' AND sai.expires_at > NOW()

            UNION ALL

            SELECT 
                'shop_post' as type,
                p.post_id as id,
                s.name as shop_name,
                s.shop_id as shop_id,
                s.name as actor_name,
                p.post_id as post_id,
                SUBSTRING(p.content FROM 1 FOR 100) as message,
                p.created_at,
                NULL as expires_at
            FROM posts p
            JOIN shops s ON p.shop_id = s.shop_id
            JOIN shop_follows sf ON s.shop_id = sf.shop_id
            WHERE sf.user_id = $1 AND p.is_official = TRUE AND p.created_at > (NOW() - INTERVAL '30 days')
            
            ORDER BY created_at DESC
            LIMIT 50
        `;
        const result = await pool.query(query, [userId]);
        const notifications = result.rows;

        // Calculate unread count (those created after last_notification_check)
        const unreadCount = notifications.filter(n => new Date(n.created_at) > new Date(lastCheck)).length;

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('API Error on /api/notifications:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- NEW: Mark Notifications as Seen ---
app.post('/api/notifications/seen', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        await pool.query('UPDATE users SET last_notification_check = NOW() WHERE user_id = $1', [userId]);
        res.json({ message: 'Notifications marked as seen' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notifications/:id/respond', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const inviteId = req.params.id;
    const { action } = req.body; // 'Accept' or 'Decline'

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const inviteCheck = await client.query(
            "SELECT shop_id FROM shop_admin_invitations WHERE invitation_id = $1 AND invited_user_id = $2 AND status = 'Pending' AND expires_at > NOW()",
            [inviteId, userId]
        );

        if (inviteCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invitation not found or expired' });
        }

        const shopId = inviteCheck.rows[0].shop_id;

        if (action === 'Accept') {
            // Check max 5 again
            const adminCount = await client.query('SELECT COUNT(*) as count FROM shop_admins WHERE shop_id = $1', [shopId]);
            if (parseInt(adminCount.rows[0].count) >= 5) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Maximum limit of 5 administrators reached' });
            }

            await client.query(
                "UPDATE shop_admin_invitations SET status = 'Accepted', responded_at = NOW() WHERE invitation_id = $1",
                [inviteId]
            );
            await client.query(
                "INSERT INTO shop_admins (shop_id, user_id, added_by) VALUES ($1, $2, (SELECT invited_by FROM shop_admin_invitations WHERE invitation_id = $3))",
                [shopId, userId, inviteId]
            );
        } else {
            await client.query(
                "UPDATE shop_admin_invitations SET status = 'Declined', responded_at = NOW() WHERE invitation_id = $1",
                [inviteId]
            );
        }

        await client.query('COMMIT');
        res.json({ message: `Invitation ${action.toLowerCase()}ed successfully` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- 7e. SEARCH USERS (for @mentions and invitations) ---
app.get('/api/users/search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ users: [] });
    try {
        const result = await pool.query(
            "SELECT user_id, username FROM users WHERE username ILIKE $1 LIMIT 10",
            [`%${q}%`]
        );
        res.json({ users: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 8. MY PROFILE ROUTE ---
app.get('/api/my-profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await pool.query(
            'SELECT u.username, u.email, u.phone_number, up.avatar_url, up.bio FROM users u LEFT JOIN user_profiles up ON u.user_id = up.user_id WHERE u.user_id = $1',
            [userId]
        );

        // Get all personal posts (with or without photos)
        const allPostsResult = await pool.query(
            `SELECT 
                p.post_id,
                p.content, 
                p.created_at, 
                COALESCE((SELECT json_agg(ph.photo_url) FROM post_photos ph WHERE ph.post_id = p.post_id), '[]'::json) as photos,
                COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.post_id), 0)::int as reaction_count,
                COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id), 0)::int as comment_count
             FROM posts p
             WHERE p.user_id = $1 AND p.is_official = false
             ORDER BY p.created_at DESC`,
            [userId]
        );

        // Flatten photos for gallery view
        const allPhotos = [];
        for (const post of allPostsResult.rows) {
            const photos = post.photos || [];
            if (photos.length > 0) {
                for (const url of photos) {
                    allPhotos.push({ photo_id: `${post.post_id}_${allPhotos.length}`, photo_url: url, content: post.content, created_at: post.created_at });
                }
            }
        }

        const postCountResult = await pool.query(
            'SELECT COUNT(*) as post_count FROM posts WHERE user_id = $1 AND is_official = false',
            [userId]
        );

        // Count followed shops
        const followedShopsResult = await pool.query(
            'SELECT COUNT(*) as count FROM shop_follows WHERE user_id = $1',
            [userId]
        );

        res.json({
            user: userResult.rows[0],
            allPhotos: allPhotos,
            posts: allPostsResult.rows,
            postCount: parseInt(postCountResult.rows[0].post_count) || 0,
            totalPhotos: allPhotos.length,
            followedShops: parseInt(followedShopsResult.rows[0].count) || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user check-ins (meaning unique shops tagged in their posts)
app.get('/api/users/me/check-ins', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    console.log(`[DEBUG] Fetching check-ins for user: ${userId}`);

    try {
        const result = await pool.query(`
            SELECT DISTINCT s.shop_id, s.name as shop_name, s.category, s.address, MAX(p.created_at) as created_at
            FROM posts p
            JOIN shops s ON p.shop_id = s.shop_id
            WHERE p.user_id = $1
            GROUP BY s.shop_id, s.name, s.category, s.address
            ORDER BY created_at DESC
        `, [userId]);

        console.log(`[DEBUG] Found ${result.rows.length} tagged shops`);
        res.json({
            checkIns: result.rows
        });

    } catch (err) {
        console.error('Get check-ins error:', err);
        res.status(500).json({ error: 'Failed to get check-ins' });
    }
});

// --- 9. UPDATE PROFILE ROUTE ---
app.put('/api/update-profile', authenticateToken, upload.single('profilePic'), async (req, res) => {
    const userId = req.user.id;
    const { username, email, phone_number, bio } = req.body;
    let avatarUrl = null;

    if (req.file) {
        avatarUrl = `${process.env.API_BASE_URL}/uploads/${req.file.filename}`;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update basic user info
        await client.query(
            'UPDATE users SET username = $1, email = $2, phone_number = $3 WHERE user_id = $4',
            [username, email, phone_number, userId]
        );

        // Update or Insert profile info
        if (avatarUrl || bio) {
            const profileCheck = await client.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
            if (profileCheck.rows.length > 0) {
                let updateQuery = 'UPDATE user_profiles SET updated_at = NOW()';
                let params = [userId];
                if (avatarUrl) {
                    updateQuery += ', avatar_url = $' + (params.length + 1);
                    params.push(avatarUrl);
                }
                if (bio) {
                    updateQuery += ', bio = $' + (params.length + 1);
                    params.push(bio);
                }
                updateQuery += ' WHERE user_id = $1';
                await client.query(updateQuery, params);
            } else {
                await client.query(
                    'INSERT INTO user_profiles (user_id, avatar_url, bio) VALUES ($1, $2, $3)',
                    [userId, avatarUrl, bio]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Profile updated successfully!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update Profile Error:", err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// --- 10. PUBLIC USER PROFILE ROUTE ---
app.get('/api/user-profile/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const userResult = await pool.query(
            'SELECT u.user_id, u.username, up.avatar_url, up.bio FROM users u LEFT JOIN user_profiles up ON u.user_id = up.user_id WHERE u.username = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        const userId = user.user_id;

        const allPostsResult = await pool.query(
            `SELECT 
                p.post_id, 
                p.content, 
                p.created_at, 
                p.is_official,
                p.post_type,
                s.name as shop_name,
                s.shop_id,
                u.username,
                up.avatar_url,
                COALESCE((SELECT json_agg(photo_url) FROM post_photos WHERE post_id = p.post_id), '[]'::json) as photos,
                COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id), 0)::int as comment_count,
                COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.post_id), 0)::int as reaction_count
             FROM posts p
             LEFT JOIN shops s ON p.shop_id = s.shop_id
             JOIN users u ON p.user_id = u.user_id
             LEFT JOIN user_profiles up ON u.user_id = up.user_id
             WHERE p.user_id = $1 AND p.is_official = false
             ORDER BY p.created_at DESC`,
            [userId]
        );

        const postCountResult = await pool.query(
            'SELECT COUNT(*) as post_count FROM posts WHERE user_id = $1 AND is_official = false',
            [userId]
        );

        res.json({
            user: user,
            posts: allPostsResult.rows,
            postCount: parseInt(postCountResult.rows[0].post_count) || 0
        });
    } catch (err) {
        console.error("Fetch User Profile Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 9. REGISTER SHOP ROUTE ---
const shopUpload = upload.fields([
    { name: 'receipt', maxCount: 1 },
    { name: 'ownership_form', maxCount: 1 },
    { name: 'certificate', maxCount: 1 },
]);
app.post('/api/register-shop', authenticateToken, shopUpload, async (req, res) => {
    const userId = req.user.id;
    const {
        name,
        email,
        phone_number,
        category,
        description,
        address,
        location_latitude,
        location_longitude,
        opening_hours,
        plan,
        devMode
    } = req.body;

    console.log('--- Register Shop Debug ---');
    console.log('User ID:', userId);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const hoursJson = opening_hours
            ? JSON.stringify({ display: opening_hours })
            : null;

        // In dev mode, auto-approve premium. Otherwise, premium starts as false (pending admin approval)
        const isDevMode = devMode === 'true' || devMode === true;
        const businessValid = plan === 'standard' ? true : (isDevMode ? true : false);

        const shopResult = await client.query(
            `INSERT INTO shops 
                (owner_id, name, description, category, address, phone_number, 
                 location_latitude, location_longitude, opening_hours, business_valid, plan_type) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING shop_id`,
            [userId, name, description || '', category, address || '', phone_number || '',
                location_latitude, location_longitude, hoursJson, businessValid, plan || 'standard']
        );

        const newShopId = shopResult.rows[0].shop_id;

        // For premium plan, create a payment record with all uploaded documents
        if (plan === 'premium') {
            const baseUrl = `${process.env.API_BASE_URL}/uploads/`;
            const files = req.files || {};
            const documents = {
                receipt: files.receipt?.[0] ? baseUrl + files.receipt[0].filename : null,
                ownership_form: files.ownership_form?.[0] ? baseUrl + files.ownership_form[0].filename : null,
                certificate: files.certificate?.[0] ? baseUrl + files.certificate[0].filename : null,
            };
            const receiptUrl = JSON.stringify(documents);
            const paymentStatus = isDevMode ? 'Approved' : 'Pending';
            await client.query(
                `INSERT INTO payments (shop_id, amount, payment_status, receipt_url) 
                 VALUES ($1, $2, $3, $4)`,
                [newShopId, 20.00, paymentStatus, receiptUrl]
            );
        }

        await client.query('COMMIT');

        const statusMsg = plan === 'premium' && !isDevMode
            ? 'Shop registered! Awaiting admin approval for premium.'
            : 'Shop registered successfully!';

        console.log('Shop registered successfully! ID:', newShopId);
        res.json({
            message: statusMsg,
            shop_id: newShopId,
            business_valid: businessValid
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Register shop error:', err.message);
        console.error('Full error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- ADMIN ROUTES ---

// Get pending shops for admin review
app.get('/api/admin/pending-shops', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.shop_id, s.name, s.category, s.address, s.description, s.phone_number,
                   s.business_valid, s.created_at,
                   u.username as owner_name, u.email as owner_email,
                   p.payment_id, p.amount, p.payment_status, p.receipt_url, p.created_at as payment_date
            FROM shops s
            JOIN users u ON s.owner_id = u.user_id
            LEFT JOIN payments p ON s.shop_id = p.shop_id
            ORDER BY s.created_at DESC
        `);
        // Parse receipt_url JSON for each row
        const shops = result.rows.map(row => {
            let documents = null;
            if (row.receipt_url) {
                try { documents = JSON.parse(row.receipt_url); } catch { documents = { receipt: row.receipt_url }; }
            }
            return { ...row, documents };
        });
        res.json({ shops });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve a shop
app.post('/api/admin/approve-shop/:shopId', authenticateToken, async (req, res) => {
    const { shopId } = req.params;
    const adminId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE shops SET business_valid = true, latest_paid_date = NOW(), updated_at = NOW() WHERE shop_id = $1', [shopId]);
        await client.query(
            `UPDATE payments SET payment_status = 'Approved', admin_id = $1, verified_at = NOW() 
             WHERE shop_id = $2 AND payment_status = 'Pending'`,
            [adminId, shopId]
        );
        await client.query('COMMIT');
        res.json({ message: 'Shop approved successfully!' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Submit monthly subscription payment
app.post('/api/shop/submit-monthly-payment', authenticateToken, upload.single('receipt'), async (req, res) => {
    const { shop_id, amount } = req.body;
    const receipt_url = req.file ? `${process.env.API_BASE_URL}/uploads/${req.file.filename}` : null;

    if (!receipt_url) return res.status(400).json({ error: 'Receipt image is required' });

    try {
        await pool.query(
            'INSERT INTO payments (shop_id, amount, payment_status, receipt_url, payment_type) VALUES ($1, $2, \'Pending\', $3, \'Monthly\')',
            [shop_id, amount, receipt_url]
        );
        res.json({ message: 'Monthly payment submitted for validation.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit payment' });
    }
});

// Get subscription status
app.get('/api/shop/subscription-status/:shopId', authenticateToken, async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await pool.query(
            'SELECT business_valid, latest_paid_date, NOW() as current_time FROM shops WHERE shop_id = $1',
            [shopId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });

        const shop = result.rows[0];
        const latestPaid = new Date(shop.latest_paid_date);
        const now = new Date(shop.current_time);
        const diffDays = Math.floor((now.getTime() - latestPaid.getTime()) / (1000 * 3600 * 24));
        const daysLeft = 30 - diffDays;

        // Auto-freeze logic
        if (daysLeft <= 0 && shop.business_valid) {
            await pool.query('UPDATE shops SET business_valid = false WHERE shop_id = $1', [shopId]);
            shop.business_valid = false;
        }

        res.json({
            business_valid: shop.business_valid,
            latest_paid_date: shop.latest_paid_date,
            days_left: daysLeft > 0 ? daysLeft : 0,
            is_frozen: !shop.business_valid
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get payment history
app.get('/api/shop/payment-history/:shopId', authenticateToken, async (req, res) => {
    const { shopId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM payments WHERE shop_id = $1 ORDER BY created_at DESC',
            [shopId]
        );
        res.json({ payments: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate monthly payment (Admin)
app.post('/api/admin/validate-monthly-payment/:paymentId', authenticateToken, async (req, res) => {
    const { paymentId } = req.params;
    const adminId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const payRes = await client.query(
            'UPDATE payments SET payment_status = \'Approved\', admin_id = $1, verified_at = NOW() WHERE payment_id = $2 RETURNING shop_id',
            [adminId, paymentId]
        );

        if (payRes.rows.length > 0) {
            const shopId = payRes.rows[0].shop_id;
            await client.query(
                'UPDATE shops SET business_valid = true, latest_paid_date = NOW(), updated_at = NOW() WHERE shop_id = $1',
                [shopId]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Monthly payment validated and subscription renewed.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Reject a shop
app.post('/api/admin/reject-shop/:shopId', authenticateToken, async (req, res) => {
    const { shopId } = req.params;
    const adminId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE shops SET business_valid = false, updated_at = NOW() WHERE shop_id = $1', [shopId]);
        await client.query(
            `UPDATE payments SET payment_status = 'Rejected', admin_id = $1, verified_at = NOW() 
             WHERE shop_id = $2 AND payment_status = 'Pending'`,
            [adminId, shopId]
        );
        await client.query('COMMIT');
        res.json({ message: 'Shop rejected.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Freeze a shop (subscription lapsed)
app.post('/api/admin/freeze-shop/:shopId', authenticateToken, async (req, res) => {
    const { shopId } = req.params;
    try {
        await pool.query('UPDATE shops SET business_valid = false, updated_at = NOW() WHERE shop_id = $1', [shopId]);
        res.json({ message: 'Shop frozen successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unfreeze a shop (reactivate)
app.post('/api/admin/unfreeze-shop/:shopId', authenticateToken, async (req, res) => {
    const { shopId } = req.params;
    try {
        await pool.query('UPDATE shops SET business_valid = true, updated_at = NOW() WHERE shop_id = $1', [shopId]);
        res.json({ message: 'Shop unfrozen successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all posts for moderation
app.get('/api/admin/all-posts', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.post_id, p.content, p.created_at, p.user_id, p.shop_id,
                   u.username, u.email as user_email,
                   s.name as shop_name,
                   COALESCE(
                       (SELECT json_agg(json_build_object('photo_id', ph.photo_id, 'photo_url', ph.photo_url))
                        FROM post_photos ph WHERE ph.post_id = p.post_id), '[]'
                   ) as photos
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN shops s ON p.shop_id = s.shop_id
            ORDER BY p.created_at DESC
        `);
        res.json({ posts: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a post (moderation)
app.delete('/api/admin/delete-post/:postId', authenticateToken, async (req, res) => {
    const { postId } = req.params;
    try {
        // Delete photos first, then post
        await pool.query('DELETE FROM post_photos WHERE post_id = $1', [postId]);
        await pool.query('DELETE FROM posts WHERE post_id = $1', [postId]);
        res.json({ message: 'Post deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 10. BOOKMARK ROUTES ---

// Add bookmark
app.post('/api/bookmarks/add', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { shop_id } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO bookmarks (user_id, shop_id) VALUES ($1, $2) ON CONFLICT (user_id, shop_id) DO NOTHING RETURNING *',
            [userId, shop_id]
        );

        res.json({
            message: 'Bookmark added successfully!',
            bookmarked: result.rows[0] || null
        });

    } catch (err) {
        console.error('Bookmark add error:', err);
        res.status(500).json({ error: 'Failed to add bookmark' });
    }
});

// Remove bookmark
app.delete('/api/bookmarks/remove', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { shop_id } = req.body;

    try {
        const result = await pool.query(
            'DELETE FROM bookmarks WHERE user_id = $1 AND shop_id = $2 RETURNING *',
            [userId, shop_id]
        );

        res.json({
            message: 'Bookmark removed successfully!',
            removed: result.rows[0] || null
        });

    } catch (err) {
        console.error('Bookmark remove error:', err);
        res.status(500).json({ error: 'Failed to remove bookmark' });
    }
});

// Get user bookmarks
app.get('/api/bookmarks', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(`
            SELECT b.*, s.name, s.category, s.address, s.location_latitude, s.location_longitude 
            FROM bookmarks b 
            JOIN shops s ON b.shop_id = s.shop_id 
            WHERE b.user_id = $1 
            ORDER BY b.created_at DESC
        `, [userId]);

        res.json({
            bookmarks: result.rows
        });

    } catch (err) {
        console.error('Get bookmarks error:', err);
        res.status(500).json({ error: 'Failed to get bookmarks' });
    }
});



// --- 12. PAYMENT ACTIONS ---
app.post('/api/payments', authenticateToken, async (req, res) => {
    const { shop_id, amount, receipt_url } = req.body;
    try {
        await pool.query(
            'INSERT INTO payments (shop_id, amount, payment_status, receipt_url) VALUES ($1, $2, \'Pending\', $3)',
            [shop_id, amount, receipt_url]
        );
        res.json({ message: 'Payment submitted for approval.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process payment' });
    }
});

// --- 13. POST MANAGEMENT (EDIT/DELETE) ---

// Edit post
app.put('/api/posts/:postId', authenticateToken, upload.single('image'), async (req, res) => {
    const { postId } = req.params;
    const { content, hashtags, shop_id } = req.body;
    const userId = req.user.id;
    const newImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        // 1. Get post to check ownership
        const postResult = await pool.query('SELECT * FROM posts WHERE post_id = $1', [postId]);
        if (postResult.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

        const post = postResult.rows[0];
        let canEdit = post.user_id === userId;

        // 2. If it's a shop post, check shop owner/admin permissions
        if (!canEdit && post.shop_id) {
            const shopResult = await pool.query('SELECT owner_id FROM shops WHERE shop_id = $1', [post.shop_id]);
            if (shopResult.rows.length > 0 && shopResult.rows[0].owner_id === userId) {
                canEdit = true;
            } else {
                const adminResult = await pool.query('SELECT 1 FROM shop_admins WHERE shop_id = $1 AND user_id = $2', [post.shop_id, userId]);
                if (adminResult.rows.length > 0) canEdit = true;
            }
        }

        if (!canEdit) return res.status(403).json({ error: 'Unauthorized to edit this post' });

        // 3. Update post
        let updateQuery = 'UPDATE posts SET content = $1, hashtags = $2, shop_id = $3';
        const queryParams = [content, hashtags, shop_id || post.shop_id];

        if (newImageUrl) {
            updateQuery += ', image_url = $4, updated_at = CURRENT_TIMESTAMP WHERE post_id = $5';
            queryParams.push(newImageUrl, postId);
        } else {
            updateQuery += ', updated_at = CURRENT_TIMESTAMP WHERE post_id = $4';
            queryParams.push(postId);
        }

        await pool.query(updateQuery, queryParams);

        res.json({ message: 'Post updated successfully' });
    } catch (err) {
        console.error('Post edit error:', err);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// Delete post
app.delete('/api/posts/:postId', authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
        // 1. Get post to check ownership
        const postResult = await pool.query('SELECT * FROM posts WHERE post_id = $1', [postId]);
        if (postResult.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

        const post = postResult.rows[0];
        let canDelete = post.user_id === userId;

        // 2. If it's a shop post, check shop owner/admin permissions
        if (!canDelete && post.shop_id) {
            const shopResult = await pool.query('SELECT owner_id FROM shops WHERE shop_id = $1', [post.shop_id]);
            if (shopResult.rows.length > 0 && shopResult.rows[0].owner_id === userId) {
                canDelete = true;
            } else {
                const adminResult = await pool.query('SELECT 1 FROM shop_admins WHERE shop_id = $1 AND user_id = $2', [post.shop_id, userId]);
                if (adminResult.rows.length > 0) canDelete = true;
            }
        }

        if (!canDelete) return res.status(403).json({ error: 'Unauthorized to delete this post' });

        // 3. Delete post
        await pool.query('DELETE FROM posts WHERE post_id = $1', [postId]);

        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Post delete error:', err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Unified Server running on port ' + PORT);
    console.log('🔒 Environment-locked: JWT_SECRET, DATABASE_URL, API_BASE_URL loaded');
});