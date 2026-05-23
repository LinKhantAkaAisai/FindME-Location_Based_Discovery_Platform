-- FINAL ROBUST DEMO DATA FOR MANDALAY, MYANMAR
DO $$
DECLARE
    u1_id INT;
    u2_id INT;
    u3_id INT;
    s1_id INT;
    s2_id INT;
    s3_id INT;
    s4_id INT;
    pass_hash TEXT := '$2b$10$lSTuGSZlk2./qc6lby8nNecbVVnYSOLeVp1AVEuGxKSbtBJne0ZA6'; -- password123
BEGIN
    -- 1. Create or Get Users (Corrected Columns)
    INSERT INTO users (username, password_hash, email, role, phone_number) 
    VALUES ('mandalay_coffee_lover', pass_hash, 'user1@example.com', 'Consumer', '09-111111111')
    ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
    RETURNING user_id INTO u1_id;

    INSERT INTO users (username, password_hash, email, role, phone_number) 
    VALUES ('mandalay_beauty_queen', pass_hash, 'user2@example.com', 'Consumer', '09-222222222')
    ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
    RETURNING user_id INTO u2_id;

    INSERT INTO users (username, password_hash, email, role, phone_number) 
    VALUES ('mandalay_admin_demo', pass_hash, 'admin_demo@mandalay.com', 'Consumer', '09-333333333')
    ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
    RETURNING user_id INTO u3_id;

    -- 2. Create or Get Shops
    SELECT shop_id INTO s1_id FROM shops WHERE name = 'Mingalar Mandalay Cafe';
    IF s1_id IS NULL THEN
        INSERT INTO shops (owner_id, name, description, category, address, phone_number, location_latitude, location_longitude, plan_type, business_valid)
        VALUES (u1_id, 'Mingalar Mandalay Cafe', 'Best traditional coffee and sunset views in the city.', 'Cafe', '78th Street, Mandalay', '09-771234567', 21.9685, 96.0821, 'standard', true)
        RETURNING shop_id INTO s1_id;
    END IF;

    SELECT shop_id INTO s2_id FROM shops WHERE name = 'Mandalay Hill Beauty Salon';
    IF s2_id IS NULL THEN
        INSERT INTO shops (owner_id, name, description, category, address, phone_number, location_latitude, location_longitude, plan_type, business_valid)
        VALUES (u2_id, 'Mandalay Hill Beauty Salon', 'Premium hair and skin care at the foot of Mandalay Hill.', 'Beauty Salon', '12th Street, near Mandalay Hill', '09-441234567', 21.9912, 96.0954, 'premium', true)
        RETURNING shop_id INTO s2_id;
    END IF;

    SELECT shop_id INTO s3_id FROM shops WHERE name = 'Ruby Jade Cosmetics';
    IF s3_id IS NULL THEN
        INSERT INTO shops (owner_id, name, description, category, address, phone_number, location_latitude, location_longitude, plan_type, business_valid)
        VALUES (u3_id, 'Ruby Jade Cosmetics', 'Authentic jade-infused cosmetics and lifestyle products.', 'Cosmetic Shop', 'Chan Aye Thar Zan, Mandalay', '09-221234567', 21.9754, 96.0754, 'standard', true)
        RETURNING shop_id INTO s3_id;
    END IF;

    SELECT shop_id INTO s4_id FROM shops WHERE name = 'The Mandalay Tea House';
    IF s4_id IS NULL THEN
        INSERT INTO shops (owner_id, name, description, category, address, phone_number, location_latitude, location_longitude, plan_type, business_valid)
        VALUES (u1_id, 'The Mandalay Tea House', 'Experience the rich culture of Burmese tea in a modern setting.', 'Cafe', 'Mahar Aung Myay, Mandalay', '09-111234567', 21.9543, 96.0887, 'premium', true)
        RETURNING shop_id INTO s4_id;
    END IF;

    -- 3. Create Posts
    INSERT INTO posts (user_id, shop_id, content, is_official)
    VALUES (u1_id, s1_id, 'Start your morning with our signature Shan Highland Coffee and a view of the city. ☕️🌅 #MandalayMorning #CoffeeCulture #MingalarCafe', true);
    INSERT INTO post_photos (post_id, photo_url) VALUES (currval('posts_post_id_seq'), '/uploads/demo_cafe.png');

    INSERT INTO posts (user_id, shop_id, content, is_official)
    VALUES (u2_id, s2_id, 'Spring Glow Special! Get 20% off all revitalizing hair treatments this week. ✨💇‍♀️ #MandalayBeauty #SelfCare #MandalayHillSalon', true);
    INSERT INTO post_photos (post_id, photo_url) VALUES (currval('posts_post_id_seq'), '/uploads/demo_salon.png');

    INSERT INTO posts (user_id, shop_id, content, is_official)
    VALUES (u3_id, s1_id, 'Absolutely loving the quiet atmosphere here. Perfect for getting some work done! 💻✨', false);
    INSERT INTO post_photos (post_id, photo_url) VALUES (currval('posts_post_id_seq'), '/uploads/demo_latte.png');

END $$;
