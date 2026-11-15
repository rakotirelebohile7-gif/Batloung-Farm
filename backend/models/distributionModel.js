const pool = require('../config/db');
exports.createSupplier = async ({ business_name, contact_person, phone, province, address }) => (await pool.query('INSERT INTO Suppliers (business_name, contact_person, phone, province, address) VALUES (?, ?, ?, ?, ?)', [business_name, contact_person, phone, province, address]))[0].insertId;
exports.getAllSuppliers = async () => (await pool.query('SELECT * FROM Suppliers ORDER BY supplier_id DESC'))[0];
exports.getSupplierById = async (id) => (await pool.query('SELECT * FROM Suppliers WHERE supplier_id = ?', [id]))[0][0];
exports.updateSupplier = async (id, { business_name, contact_person, phone, province, address }) => (await pool.query('UPDATE Suppliers SET business_name=?, contact_person=?, phone=?, province=?, address=? WHERE supplier_id=?', [business_name, contact_person, phone, province, address, id]))[0].affectedRows;
exports.deleteSupplier = async (id) => (await pool.query('DELETE FROM Suppliers WHERE supplier_id = ?', [id]))[0].affectedRows;
exports.createFruit = async ({ fruit_name, description, status }) => {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [r] = await c.query('INSERT INTO Fruits (fruit_name, description, status) VALUES (?, ?, ?)', [fruit_name, description || '', status || 'Available']);
    for (const s of ['Small','Medium','Large']) await c.query('INSERT INTO Stock (fruit_id, packaging_size, available_quantity) VALUES (?, ?, 0)', [r.insertId, s]);
    await c.commit(); return r.insertId;
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
};
exports.getAllFruits = async () => (await pool.query('SELECT * FROM Fruits ORDER BY fruit_id ASC'))[0];
exports.updateFruit = async (id, { fruit_name, description, status }) => (await pool.query('UPDATE Fruits SET fruit_name=?, description=?, status=? WHERE fruit_id=?', [fruit_name, description, status, id]))[0].affectedRows;
exports.getStockLevels = async () => (await pool.query("SELECT s.stock_id, f.fruit_id, f.fruit_name, f.description, f.status, s.packaging_size, s.available_quantity FROM Stock s JOIN Fruits f ON s.fruit_id = f.fruit_id ORDER BY f.fruit_name, FIELD(s.packaging_size, 'Small', 'Medium', 'Large')"))[0];
exports.getLowStock = async (t = 10) => (await pool.query('SELECT s.stock_id, f.fruit_name, s.packaging_size, s.available_quantity FROM Stock s JOIN Fruits f ON s.fruit_id = f.fruit_id WHERE s.available_quantity <= ? ORDER BY s.available_quantity ASC', [t]))[0];
exports.createVendor = async ({ vendor_name, phone_number, location }) => (await pool.query('INSERT INTO Vendors (vendor_name, phone_number, location) VALUES (?, ?, ?)', [vendor_name, phone_number, location]))[0].insertId;
exports.getAllVendors = async () => (await pool.query('SELECT v.*, COALESCE(SUM(s.total_amount - s.amount_paid), 0) AS outstanding_balance FROM Vendors v LEFT JOIN Sales s ON v.vendor_id = s.vendor_id GROUP BY v.vendor_id ORDER BY v.vendor_id DESC'))[0];
exports.searchVendors = async (q) => (await pool.query('SELECT * FROM Vendors WHERE vendor_name LIKE ? OR phone_number LIKE ?', ['%' + q + '%', '%' + q + '%']))[0];
exports.updateVendor = async (id, { vendor_name, phone_number, location }) => (await pool.query('UPDATE Vendors SET vendor_name=?, phone_number=?, location=? WHERE vendor_id=?', [vendor_name, phone_number, location, id]))[0].affectedRows;
exports.recordPurchase = async ({ supplier_id, items }) => {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const total = items.reduce((s, i) => s + (i.quantity * i.unit_cost), 0);
    const [p] = await c.query('INSERT INTO Purchases (supplier_id, total_amount) VALUES (?, ?)', [supplier_id, total]);
    for (const i of items) {
      if (i.quantity <= 0 || i.unit_cost <= 0) { const e = new Error('Invalid quantity or cost'); e.statusCode = 400; throw e; }
      await c.query('INSERT INTO Purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES (?, ?, ?, ?, ?)', [p.insertId, i.fruit_id, i.quantity, i.unit_cost, i.packaging_size]);
      await c.query('INSERT INTO Stock (fruit_id, packaging_size, available_quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE available_quantity = available_quantity + VALUES(available_quantity)', [i.fruit_id, i.packaging_size, i.quantity]);
    }
    await c.commit(); return { purchase_id: p.insertId, total_amount: total };
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
};
exports.recordSale = async ({ vendor_id, items, payment_method = 'Cash', amount_paid = 0 }) => {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const prices = { Small: 120, Medium: 220, Large: 350 };
    let total = 0;
    for (const i of items) {
      const price = i.unit_price || prices[i.packaging_size];
      if (!price || i.quantity <= 0) { const e = new Error('Invalid size or quantity'); e.statusCode = 400; throw e; }
      const [st] = await c.query('SELECT available_quantity FROM Stock WHERE fruit_id = ? AND packaging_size = ? FOR UPDATE', [i.fruit_id, i.packaging_size]);
      const avail = st.length ? st[0].available_quantity : 0;
      if (avail < i.quantity) { const e = new Error('Insufficient stock for fruit ID ' + i.fruit_id + ' (' + i.packaging_size + '). Requested: ' + i.quantity + ', Available: ' + avail); e.statusCode = 400; throw e; }
      i.computed_price = price; total += i.quantity * price;
    }
    const paid = Number(amount_paid);
    const status = paid >= total ? 'PAID' : (paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
    const [s] = await c.query('INSERT INTO Sales (vendor_id, payment_method, payment_status, total_amount, amount_paid) VALUES (?, ?, ?, ?, ?)', [vendor_id, payment_method, status, total, paid]);
    for (const i of items) {
      await c.query('INSERT INTO Sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', [s.insertId, i.fruit_id, i.packaging_size, i.quantity, i.computed_price]);
      await c.query('UPDATE Stock SET available_quantity = available_quantity - ? WHERE fruit_id = ? AND packaging_size = ?', [i.quantity, i.fruit_id, i.packaging_size]);
    }
    await c.commit(); return { sale_id: s.insertId, total_amount: total, amount_paid: paid, payment_status: status, outstanding_balance: Math.max(0, total - paid) };
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
};
exports.getReports = async (start, end) => {
  const [topFruits] = await pool.query('SELECT f.fruit_name, SUM(sd.quantity) AS total_boxes_sold FROM Sales_details sd JOIN Fruits f ON sd.fruit_id = f.fruit_id GROUP BY f.fruit_id, f.fruit_name ORDER BY total_boxes_sold DESC LIMIT 5');
  const [rev] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM Sales WHERE DATE(sale_date) BETWEEN ? AND ?', [start || '2000-01-01', end || '2099-12-31']);
  const [topVendor] = await pool.query('SELECT v.vendor_id, v.vendor_name, SUM(sd.quantity) AS total_boxes FROM Sales s JOIN Vendors v ON s.vendor_id = v.vendor_id JOIN Sales_details sd ON s.sale_id = sd.sale_id GROUP BY v.vendor_id, v.vendor_name ORDER BY total_boxes DESC LIMIT 1');
  return { top_5_fruits: topFruits, sales_revenue: rev[0].total_revenue, top_vendor: topVendor[0] || null, current_stock: await exports.getStockLevels() };
};
