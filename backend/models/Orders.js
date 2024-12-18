import pool from '../db.js'; 

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const createOrder = async (user_id) => {
    let order_id;
    let unique = false;

    try {
        console.log('Starting to create an order...');
        while (!unique) {
            order_id = getRandomInt(1, 1000); 
            console.log(`Generated order_id: ${order_id}`);
            const result = await pool.query(
                'SELECT 1 FROM Orders WHERE order_id = $1',
                [order_id]
            );

            if (result.rowCount === 0) {
                unique = true;
                console.log(`order_id ${order_id} is unique.`);
            } else {
                console.log(`order_id ${order_id} already exists. Generating a new one.`);
            }
        }

        const adminResult = await pool.query(
            'SELECT admin_username FROM Admin ORDER BY RANDOM() LIMIT 1'
        );

        if (adminResult.rows.length === 0) {
            throw new Error('No admin found in the database');
        }

        const admin_username = adminResult.rows[0].admin_username;
        console.log(`Selected admin_username: ${admin_username}`);

        const result = await pool.query(
            `INSERT INTO Orders (order_id, status, created_at, user_id, admin_username)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [order_id, 'pending', new Date(), user_id, admin_username]
        );

        console.log('Order created successfully:', result.rows[0]);
        return result.rows[0]; 
    } catch (error) {
        console.error('Error creating order:', error.message);
        throw error;
    }
};
export const CartToOrderProducts = async (user_id, order_id) => {
    try {
        console.log('Starting transferCartToOrderProducts function');
        const cartResult = await pool.query(
            `SELECT cart_id FROM Cart WHERE user_id = $1`,
            [user_id]
        );
        console.log(`Query executed to retrieve cart_id for user_id ${user_id}:`, cartResult.rows);

        if (cartResult.rows.length === 0) {
            console.log('No cart found for this user');
            throw new Error('No cart found for this user');
        }

        const cart_id = cartResult.rows[0].cart_id;
        console.log('Cart ID retrieved for user:', cart_id);

        const cartProductsResult = await pool.query(
            `SELECT product_id, quantity FROM CartProducts WHERE cart_id = $1`,
            [cart_id]
        );
        console.log(`Query executed to retrieve products in cart with cart_id ${cart_id}:`, cartProductsResult.rows);

        const cartProducts = cartProductsResult.rows;

        if (cartProducts.length === 0) {
            console.log('Cart is empty');
            throw new Error('Cart is empty');
        }

        console.log('Products in cart:', cartProducts);
        for (const product of cartProducts) {
            const { product_id, quantity } = product;
            const existingProductResult = await pool.query(
                `SELECT * FROM OrderProducts WHERE order_id = $1 AND product_id = $2`,
                [order_id, product_id]
            );

            if (existingProductResult.rows.length > 0) {
                console.log(`Product ${product_id} already exists in order ${order_id}. Updating quantity...`);
                const productPriceResult = await pool.query(
                    `SELECT price FROM Products WHERE product_id = $1`,
                    [product_id]
                );
                const price_at_order = productPriceResult.rows[0].price * quantity;

                await pool.query(
                    `UPDATE OrderProducts
                     SET quantity = $1, price_at_order = $2
                     WHERE order_id = $3 AND product_id = $4`,
                    [quantity, price_at_order, order_id, product_id]
                );
                console.log(`Updated Product ${product_id} in OrderProducts with new quantity and price`);
            } else {
                console.log(`Product ${product_id} does not exist in order ${order_id}. Adding to OrderProducts...`);

                const productPriceResult = await pool.query(
                    `SELECT price FROM Products WHERE product_id = $1`,
                    [product_id]
                );
                const price_at_order = productPriceResult.rows[0].price * quantity;

                await pool.query(
                    `INSERT INTO OrderProducts (order_id, product_id, quantity, price_at_order)
                     VALUES ($1, $2, $3, $4)`,
                    [order_id, product_id, quantity, price_at_order]
                );
                console.log(`Product ${product_id} added to OrderProducts with order_id ${order_id}`);
            }
        }
        await pool.query(`DELETE FROM CartProducts WHERE cart_id = $1`, [cart_id]);
        console.log(`Cleared CartProducts for cart ID: ${cart_id}`);

        return { message: 'Cart products transferred to order successfully' };
    } catch (error) {
        console.error('Error in transferCartToOrderProducts:', error);
        throw new Error('Error transferring cart to order: ' + error.message);
    }
};
