const dbInit = require('./db');
(async () => {
  try {
    await dbInit.query(`CREATE TABLE IF NOT EXISTS fruits (fruit_id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), category VARCHAR(50), unit VARCHAR(20), cost_price DECIMAL(10,2), selling_price DECIMAL(10,2))`);
    await dbInit.query(`CREATE TABLE IF NOT EXISTS stock_inventory (stock_id INT AUTO_INCREMENT PRIMARY KEY, fruit_id INT, batch_code VARCHAR(50), quantity_available INT, expiry_date DATE, status VARCHAR(30))`);
    await dbInit.query(`CREATE TABLE IF NOT EXISTS suppliers (supplier_id INT AUTO_INCREMENT PRIMARY KEY, supplier_name VARCHAR(120), province VARCHAR(60), contact_person VARCHAR(100), phone VARCHAR(40), email VARCHAR(120))`);
    await dbInit.query(`CREATE TABLE IF NOT EXISTS vendors (vendor_id INT AUTO_INCREMENT PRIMARY KEY, vendor_name VARCHAR(120), market_location VARCHAR(120), contact_phone VARCHAR(40), credit_limit DECIMAL(10,2), current_balance DECIMAL(10,2))`);
    await dbInit.query(`CREATE TABLE IF NOT EXISTS orders (order_id INT AUTO_INCREMENT PRIMARY KEY, vendor_id INT, fruit_id INT, quantity INT, total_amount DECIMAL(10,2), payment_status VARCHAR(30), delivery_status VARCHAR(30), order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await dbInit.query(`CREATE TABLE IF NOT EXISTS supplier_purchases (purchase_id INT AUTO_INCREMENT PRIMARY KEY, supplier_id INT, fruit_id INT, quantity INT, total_cost DECIMAL(10,2), purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    const [[{ c }]] = await dbInit.query(`SELECT COUNT(*) AS c FROM fruits`);
    if (c === 0) {
      await dbInit.query(`INSERT INTO fruits (name, category, unit, cost_price, selling_price) VALUES ('Fuji Apples','Pome Fruit','Crate',180,260),('Navel Oranges','Citrus','Bag',95,145),('Cavendish Bananas','Tropical','Box',140,210),('Hass Avocados','Subtropical','Crate',220,320),('Red Globe Grapes','Table Grapes','Punnet Box',160,240),('Queen Pineapples','Tropical','Box',130,195)`);
      await dbInit.query(`INSERT INTO stock_inventory (fruit_id, batch_code, quantity_available, expiry_date, status) VALUES (1,'BF-2026-01',48,DATE_ADD(CURDATE(),INTERVAL 18 DAY),'Fresh'),(2,'BF-2026-02',65,DATE_ADD(CURDATE(),INTERVAL 14 DAY),'Fresh'),(3,'BF-2026-03',12,DATE_ADD(CURDATE(),INTERVAL 2 DAY),'Expiring Soon'),(4,'BF-2026-04',30,DATE_ADD(CURDATE(),INTERVAL 9 DAY),'Fresh'),(5,'BF-2026-05',8,DATE_ADD(CURDATE(),INTERVAL 1 DAY),'Expiring Soon'),(6,'BF-2026-06',34,DATE_ADD(CURDATE(),INTERVAL 11 DAY),'Fresh')`);
      await dbInit.query(`INSERT INTO suppliers (supplier_name, province, contact_person, phone, email) VALUES ('Ladybrand Highlands Orchards','Free State','Thabo Mokoena','+27 51 924 3310','orders@ladybrandorchards.co.za'),('Tzaneen Sunburst Citrus','Limpopo','Lindiwe Nkosi','+27 15 307 4412','sales@tzaneencitrus.co.za'),('Lowveld Tropical Estates','Mpumalanga','Pieter van Wyk','+27 13 752 8890','export@lowveldtropical.co.za')`);
      await dbInit.query(`INSERT INTO vendors (vendor_name, market_location, contact_phone, credit_limit, current_balance) VALUES ('Maseru Central Market Stall 12','Kingsway, Maseru','+266 5812 3401',5000,1250),('Pioneer Mall Fresh Grocers','Pioneer Rd, Maseru','+266 5890 1122',12000,3400),('Teyateyaneng Corner Mart','Main North 1, TY','+266 5744 8810',4500,900),('Mafeteng Wholesale Depot','Main South 1, Mafeteng','+266 5921 6630',8000,2100)`);
      await dbInit.query(`INSERT INTO orders (vendor_id, fruit_id, quantity, total_amount, payment_status, delivery_status) VALUES (1,1,5,1300,'Paid','Delivered'),(2,2,10,1450,'Paid','Delivered'),(3,3,4,840,'Pending','In Transit'),(4,4,6,1920,'Paid','Delivered'),(1,6,5,975,'Pending','Pending')`);
      await dbInit.query(`INSERT INTO supplier_purchases (supplier_id, fruit_id, quantity, total_cost) VALUES (1,1,60,10800),(2,2,80,7600),(3,3,40,5600)`);
    }
    console.log('Railway MySQL tables verified and seeded!');
  } catch (e) { console.error('DB init warning:', e.message); }
})();
const express = require('express'), cors = require('cors'); require('dotenv').config(); const app = express(); app.use(cors()); app.use(express.json()); app.use('/api', require('./routes/apiRoutes')); app.use(require('./middleware/errorHandler')); app.listen(5000, () => console.log('Batloung Farm API running on http://localhost:5000'));

