import React, { useState, useEffect } from 'react';
import './App.css';

const API = 'https://batloung-farm-production-23019dad.up.railway.app/api';
const PROVINCES = ['Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West'];
const SIZE_PRICES = { Small: 120, Medium: 220, Large: 350 };
function App() {
  const [tab, setTab] = useState('dashboard');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [fruits, setFruits] = useState([]);
  const [stock, setStock] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [reports, setReports] = useState(null);
  const [fruitFilter, setFruitFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [provinceFilter, setProvinceFilter] = useState('ALL');
  const [vendorSearch, setVendorSearch] = useState('');
  const [supForm, setSupForm] = useState({ business_name: '', contact_person: '', phone: '', province: 'Gauteng', address: '' });
  const [editSupId, setEditSupId] = useState(null);
  const [venForm, setVenForm] = useState({ vendor_name: '', phone_number: '', location: '' });
  const [fruitForm, setFruitForm] = useState({ fruit_name: '', description: '', status: 'Available' });
  const [purchaseSupId, setPurchaseSupId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([{ fruit_id: '', packaging_size: 'Small', quantity: 1, unit_cost: 80 }]);
  const [saleVendorId, setSaleVendorId] = useState('');
  const [saleMethod, setSaleMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [saleItems, setSaleItems] = useState([{ fruit_id: '', packaging_size: 'Small', quantity: 1 }]);
  const notify = (msg, isError = false) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 4000); };
  const switchTab = (nextTab) => { if (nextTab === tab) return; setIsTransitioning(true); setTimeout(() => { setTab(nextTab); setIsTransitioning(false); }, 320); };

  const loadAll = async () => {
    try {
      const [fRes, stRes, lowRes, supRes, venRes, repRes] = await Promise.all([
        fetch(`${API}/fruits`).then(r => r.json()), fetch(`${API}/stock`).then(r => r.json()),
        fetch(`${API}/stock/low?threshold=10`).then(r => r.json()), fetch(`${API}/suppliers`).then(r => r.json()),
        fetch(`${API}/vendors`).then(r => r.json()), fetch(`${API}/reports`).then(r => r.json())
      ]);
      if (fRes.success) setFruits(fRes.data); if (stRes.success) setStock(stRes.data);
      if (lowRes.success) setLowStock(lowRes.data); if (supRes.success) setSuppliers(supRes.data);
      if (venRes.success) setVendors(venRes.data); if (repRes.success) setReports(repRes.data);
    } catch { notify('Backend offline on port 5000', true); }
  };
  useEffect(() => {
    let intervalId;
    const t1 = setTimeout(() => {
      intervalId = setInterval(() => {
      }, 120000);
    }, 2000);
    return () => { clearTimeout(t1); if (intervalId) clearInterval(intervalId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(editSupId ? `${API}/suppliers/${editSupId}` : `${API}/suppliers`, { method: editSupId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) });
    const data = await res.json(); if (!res.ok) return notify(data.message, true);
    notify(editSupId ? 'Supplier updated!' : 'Supplier saved to MySQL!');
    setSupForm({ business_name: '', contact_person: '', phone: '', province: 'Gauteng', address: '' }); setEditSupId(null); setModal(null); loadAll();
  };
  const deleteSupplier = async (id) => { const res = await fetch(`${API}/suppliers/${id}`, { method: 'DELETE' }); const data = await res.json(); if (!res.ok) return notify(data.message, true); notify('Supplier deleted'); loadAll(); };
  const handleVendorSubmit = async (e) => { e.preventDefault(); const res = await fetch(`${API}/vendors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(venForm) }); const data = await res.json(); if (!res.ok) return notify(data.message, true); notify('Vendor saved!'); setVenForm({ vendor_name: '', phone_number: '', location: '' }); setModal(null); loadAll(); };
  const handleFruitSubmit = async (e) => { e.preventDefault(); const res = await fetch(`${API}/fruits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fruitForm) }); const data = await res.json(); if (!res.ok) return notify(data.message, true); notify('Fruit added!'); setFruitForm({ fruit_name: '', description: '', status: 'Available' }); setModal(null); loadAll(); };
  const submitPurchase = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/purchases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier_id: Number(purchaseSupId), items: purchaseItems.map(i => ({ ...i, fruit_id: Number(i.fruit_id), quantity: Number(i.quantity), unit_cost: Number(i.unit_cost) })) }) });
    const data = await res.json(); if (!res.ok) return notify(data.message, true);
    notify(`Purchase #${data.data.purchase_id} saved!`); setPurchaseItems([{ fruit_id: '', packaging_size: 'Small', quantity: 1, unit_cost: 80 }]); setModal(null); loadAll();
  };
  const saleTotal = saleItems.reduce((sum, i) => sum + (Number(i.quantity || 0) * (SIZE_PRICES[i.packaging_size] || 0)), 0);
  const submitSale = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: Number(saleVendorId), payment_method: saleMethod, amount_paid: Number(amountPaid), items: saleItems.map(i => ({ ...i, fruit_id: Number(i.fruit_id), quantity: Number(i.quantity) })) }) });
    const data = await res.json(); if (!res.ok) return notify(data.message, true);
    notify(`Sale #${data.data.sale_id} (${data.data.payment_status})!`); setSaleItems([{ fruit_id: '', packaging_size: 'Small', quantity: 1 }]); setAmountPaid(0); setModal(null); loadAll();
  };
  const openQuickModal = (fruitId, size) => { setSaleItems([{ fruit_id: fruitId, packaging_size: size, quantity: 1 }]); setModal('quickOrder'); };
  const filteredFruits = fruits.filter(f => { const fs = stock.filter(s => s.fruit_id === f.fruit_id); if (fruitFilter !== 'ALL' && f.status !== fruitFilter) return false; if (stockFilter === 'LOW' && !fs.some(s => s.available_quantity <= 10)) return false; if (stockFilter === 'IN_STOCK' && fs.reduce((a, b) => a + b.available_quantity, 0) === 0) return false; return true; });
  const filteredSuppliers = suppliers.filter(s => provinceFilter === 'ALL' || s.province === provinceFilter);
  const filteredVendors = vendors.filter(v => v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) || v.phone_number.includes(vendorSearch));
  return (
    <div>
      {isTransitioning && <div className="loading-overlay"><div className="loading-text">Loading........</div></div>}
      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.msg}</div>}
      <header className="navbar">
        <div className="brand">Batloung <span>Farm</span></div>
        <nav className="nav-tabs">{[{ id: 'dashboard', label: 'Dashboard' }, { id: 'stock', label: 'Stock & Shop' }, { id: 'suppliers', label: 'Suppliers' }, { id: 'vendors', label: 'Vendors' }, { id: 'reports', label: 'Reports' }].map(t => <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => switchTab(t.id)}>{t.label}</button>)}</nav>
      </header>
      <main className="container">
        <div className="top-client-hero"><div className="top-client-inner"><div><h1>Fresh Farm Produce Delivered Across Lesotho</h1><p>Welcome to Batloung Farm &mdash; supplying Maseru &amp; Lesotho vendors with crisp apples, bananas, oranges, grapes, and mangoes in Small, Medium, and Large wholesale boxes.</p></div><button className="top-client-btn" onClick={() => setModal('quickOrder')}>Order Wholesale Boxes</button></div></div>
        {lowStock.length > 0 && <div className="alert-banner"><strong>Low Stock Alert:</strong> {lowStock.map(l => `${l.fruit_name} (${l.packaging_size}: ${l.available_quantity} boxes)`).join('  |  ')}</div>}
                                {tab === 'dashboard' && (
          <>
            <div className="portal-strip">
              <div className="portal-item" onClick={() => switchTab('vendors')}>
                <div className="portal-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg></div>
                <div><strong>For Lesotho Vendors</strong><div style={{ fontSize: '13px', color: '#666' }}>Vendor Order &amp; Credit Portal</div></div>
              </div>
              <div className="portal-item" onClick={() => switchTab('suppliers')}>
                <div className="portal-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="1.8"><rect x="1" y="6" width="14" height="10" rx="1"/><path d="M15 9h4l3 3v4h-7V9z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg></div>
                <div><strong>SA Farm Suppliers</strong><div style={{ fontSize: '13px', color: '#666' }}>Provincial Orchard Supply Portal</div></div>
              </div>
              <div className="portal-item" onClick={() => setModal('quickOrder')}>
                <div className="portal-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg></div>
                <div><strong>Dispatch Desk</strong><div style={{ fontSize: '13px', color: '#666' }}>orders@batloungfarm.co.ls</div></div>
              </div>
            </div>

            <div className="cat-grid">
              <div className="cat-card" onClick={() => setModal('quickOrder')}>
                <img className="cat-img" src={require('./my-fruites.jpg')} alt="Wholesale Crates" />
                <div className="cat-label">Wholesale Crates</div>
              </div>
              <div className="cat-card" onClick={() => switchTab('stock')}>
                <img className="cat-img" src={require('./vendor-bg.jpeg')} alt="Fresh Fruits" />
                <div className="cat-label">Fresh Fruits</div>
              </div>
              <div className="cat-card" onClick={() => setModal('purchase')}>
                <img className="cat-img" src={require('./tropical-right.png')} alt="Tropical Harvest" />
                <div className="cat-label">Tropical Harvest</div>
              </div>
            </div>

            <div className="panel batloung-map-card" style={{ marginTop: '24px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}><div><h3 style={{ margin: 0, fontSize: '18px' }}>Maseru Distribution Hub &amp; SA Orchard Corridor</h3><p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>Central Maseru Wholesale Depot &bull; Maseru Bridge Border &bull; Free State, Limpopo &amp; Mpumalanga Supply Routes</p></div><span style={{ fontSize: '12px', fontWeight: 700, padding: '5px 10px', borderRadius: '3px', background: '#eef5ee', color: '#1b7a3d' }}>Active Cold-Chain Corridor</span></div><iframe title="Batloung Farm Maseru Location Map" width="100%" height="290" style={{ border: '1px solid #e0e0e0', borderRadius: '4px', display: 'block' }} loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=27.4350%2C-29.3450%2C27.5350%2C-29.2850&layer=mapnik&marker=-29.3151%2C27.4869" /></div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Total Sales Revenue</div>
                <div className="kpi-value">M{Number(reports?.sales_revenue || 0).toFixed(2)}</div>
                <div className="kpi-sub">Recorded in MySQL Sales</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Available Stock Boxes</div>
                <div className="kpi-value">{stock.reduce((sum, s) => sum + Number(s.available_quantity || 0), 0)}</div>
                <div className="kpi-sub">{lowStock.length} packaging tiers low (&le;10)</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Outstanding Vendor Credit</div>
                <div className="kpi-value" style={{ color: '#b91c1c' }}>
                  M{vendors.reduce((sum, v) => sum + Number(v.outstanding_balance || 0), 0).toFixed(2)}
                </div>
                <div className="kpi-sub">Across {vendors.length} Lesotho vendors</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">South African Suppliers</div>
                <div className="kpi-value">{suppliers.length}</div>
                <div className="kpi-sub">Active provincial orchards</div>
              </div>
            </div>

            <div className="dash-split">
              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3>Live Packaging Stock Matrix</h3>
                  <button className="btn-outline" style={{ flex: 'none' }} onClick={() => switchTab('stock')}>Open Storefront &rarr;</button>
                </div>
                <table>
                  <thead><tr><th>Fruit</th><th>Small</th><th>Medium</th><th>Large</th><th>Total Boxes</th></tr></thead>
                  <tbody>
                    {fruits.map(f => {
                      const sm = stock.find(s => s.fruit_id === f.fruit_id && s.packaging_size === 'Small')?.available_quantity || 0;
                      const md = stock.find(s => s.fruit_id === f.fruit_id && s.packaging_size === 'Medium')?.available_quantity || 0;
                      const lg = stock.find(s => s.fruit_id === f.fruit_id && s.packaging_size === 'Large')?.available_quantity || 0;
                      return (
                        <tr key={f.fruit_id}>
                          <td><strong>{f.fruit_name}</strong></td>
                          <td style={{ color: sm <= 10 ? '#b91c1c' : '#222', fontWeight: 600 }}>{sm}</td>
                          <td style={{ color: md <= 10 ? '#b91c1c' : '#222', fontWeight: 600 }}>{md}</td>
                          <td style={{ color: lg <= 10 ? '#b91c1c' : '#222', fontWeight: 600 }}>{lg}</td>
                          <td><strong>{sm + md + lg}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <h3 style={{ marginBottom: '12px' }}>Quick Actions & Top Performers</h3>
                <div className="form-stack" style={{ marginBottom: '20px' }}>
                  <button className="btn-cta" onClick={() => setModal('supplier')}>+ Register SA Supplier</button>
                  <button className="btn-outline" onClick={() => setModal('vendor')}>+ Register Lesotho Vendor</button>
                  <button className="btn-outline" onClick={() => setModal('fruit')}>+ Add New Fruit Type</button>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '14px' }}>
                  <div className="kpi-label">Top Purchasing Vendor</div>
                  <div style={{ fontWeight: 700, marginTop: '4px' }}>
                    {reports?.top_vendor ? `${reports.top_vendor.vendor_name} (${reports.top_vendor.total_boxes} boxes)` : 'No sales recorded yet'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'stock' && (<>
          <div className="toolbar">
            <div className="filter-group"><strong>Filter:</strong><select style={{ width: 'auto' }} value={fruitFilter} onChange={e => setFruitFilter(e.target.value)}><option value="ALL">All Statuses</option><option value="Available">Available</option><option value="Seasonal">Seasonal</option></select><select style={{ width: 'auto' }} value={stockFilter} onChange={e => setStockFilter(e.target.value)}><option value="ALL">All Stock</option><option value="IN_STOCK">In Stock</option><option value="LOW">Low Stock (&le;10)</option></select></div>
            <div className="filter-group"><button className="btn-outline" onClick={() => setModal('fruit')}>+ Add Fruit</button><button className="btn-primary" onClick={() => setModal('purchase')}>+ Restock Stock</button></div>
          </div>
          <div className="product-grid">{filteredFruits.map(fruit => (<div className="product-card" key={fruit.fruit_id}><div><div className="studio-card-top"><span className="studio-badge">Fresh Harvest</span></div><div className="product-title">{fruit.fruit_name} Crate</div><div className="product-desc">{fruit.description}</div><div className="product-price">from M120.00</div><div className="stock-pills">{stock.filter(s => s.fruit_id === fruit.fruit_id).map(s => <span key={s.stock_id} className={`pill ${s.available_quantity <= 10 ? 'low' : ''}`}>{s.packaging_size}: {s.available_quantity}</span>)}</div></div><div className="card-actions"><button className="btn-outline" onClick={() => openQuickModal(fruit.fruit_id, 'Small')}>Quick shop</button><button className="btn-primary" onClick={() => openQuickModal(fruit.fruit_id, 'Large')}>Choose options</button></div></div>))}</div>
          <div className="center-cta"><button className="btn-cta" onClick={() => setModal('quickOrder')}>Shop collection</button></div>
          <h2 className="section-title">Luxe Packaging Crates</h2>
          <div className="product-grid">{[{ title: 'Small Vendor Crate', price: 'M120.00', desc: '10kg street vendor box', size: 'Small' }, { title: 'Medium Retailer Crate', price: 'M220.00', desc: '20kg Maseru mini-mart crate', size: 'Medium' }, { title: 'Large Wholesale Crate', price: 'M350.00', desc: '35kg bulk distribution box', size: 'Large' }, { title: 'Tropical Sampler Box', price: 'M220.00', desc: 'Fresh Limpopo harvest', size: 'Medium' }, { title: 'Vineyard Grape Carton', price: 'M350.00', desc: 'Export-grade table grapes', size: 'Large' }].map((c, idx) => (<div className="product-card" key={idx}><div><div className="studio-card-top"><span className="studio-badge">Fresh Harvest</span></div><div className="product-title">{c.title}</div><div className="product-desc">{c.desc}</div><div className="product-price">{c.price}</div></div><div className="card-actions"><button className="btn-outline" onClick={() => openQuickModal(fruits?.fruit_id || 1, c.size)}>Quick shop</button><button className="btn-primary" onClick={() => openQuickModal(fruits?.fruit_id || 1, c.size)}>Choose options</button></div></div>))}</div>
        </>)}
        {tab === 'suppliers' && (<div className="panel"><div className="toolbar"><select style={{ width: 'auto' }} value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)}><option value="ALL">All SA Provinces</option>{PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}</select><button className="btn-cta" onClick={() => { setEditSupId(null); setSupForm({ business_name: '', contact_person: '', phone: '', province: 'Gauteng', address: '' }); setModal('supplier'); }}>+ Register Supplier</button></div><table><thead><tr><th>ID</th><th>Business</th><th>Contact</th><th>Phone</th><th>Province</th><th>Address</th><th>Actions</th></tr></thead><tbody>{filteredSuppliers.map(s => (<tr key={s.supplier_id}><td>{s.supplier_id}</td><td>{s.business_name}</td><td>{s.contact_person}</td><td>{s.phone}</td><td>{s.province}</td><td>{s.address}</td><td style={{ display: 'flex', gap: '6px' }}><button className="btn-outline" onClick={() => { setEditSupId(s.supplier_id); setSupForm(s); setModal('supplier'); }}>Edit</button><button className="btn-primary" onClick={() => deleteSupplier(s.supplier_id)}>Delete</button></td></tr>))}</tbody></table></div>)}
        {tab === 'vendors' && (<div className="panel"><div className="toolbar"><input style={{ maxWidth: '320px' }} placeholder="Search vendor..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} /><button className="btn-cta" onClick={() => setModal('vendor')}>+ Register Vendor</button></div><table><thead><tr><th>ID</th><th>Vendor</th><th>Phone</th><th>Location</th><th>Balance Due</th></tr></thead><tbody>{filteredVendors.map(v => (<tr key={v.vendor_id}><td>{v.vendor_id}</td><td>{v.vendor_name}</td><td>{v.phone_number}</td><td>{v.location}</td><td style={{ fontWeight: 700, color: Number(v.outstanding_balance) > 0 ? '#b91c1c' : '#166534' }}>M{Number(v.outstanding_balance || 0).toFixed(2)}</td></tr>))}</tbody></table></div>)}
        {tab === 'reports' && reports && (<div className="panel"><h3>Total Revenue: M{Number(reports.sales_revenue).toFixed(2)} | Top Vendor: {reports.top_vendor ? `${reports.top_vendor.vendor_name} (${reports.top_vendor.total_boxes} boxes)` : 'N/A'}</h3><table><thead><tr><th>Top 5 Fruits</th><th>Boxes Sold</th></tr></thead><tbody>{reports.top_5_fruits.map((f, i) => <tr key={i}><td>{f.fruit_name}</td><td>{f.total_boxes_sold}</td></tr>)}</tbody></table></div>)}
      </main>
      {modal && (<div className="modal-backdrop" onClick={() => setModal(null)}><div className="modal-box" onClick={e => e.stopPropagation()}><div className="modal-header"><h3>{modal === 'supplier' ? 'Supplier Details' : modal === 'vendor' ? 'Register Vendor' : modal === 'fruit' ? 'Add Fruit' : modal === 'purchase' ? 'Record Purchase' : 'Record Sale'}</h3><button className="modal-close" onClick={() => setModal(null)}>&times;</button></div>
        {modal === 'supplier' && (<form className="form-stack" onSubmit={handleSupplierSubmit}><input placeholder="Business Name" value={supForm.business_name} onChange={e => setSupForm({ ...supForm, business_name: e.target.value })} required /><input placeholder="Contact Person" value={supForm.contact_person} onChange={e => setSupForm({ ...supForm, contact_person: e.target.value })} required /><input placeholder="Phone" value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} required /><select value={supForm.province} onChange={e => setSupForm({ ...supForm, province: e.target.value })}>{PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}</select><input placeholder="Address" value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })} required /><button className="btn-cta" type="submit">Save to MySQL</button></form>)}
        {modal === 'vendor' && (<form className="form-stack" onSubmit={handleVendorSubmit}><input placeholder="Vendor Name" value={venForm.vendor_name} onChange={e => setVenForm({ ...venForm, vendor_name: e.target.value })} required /><input placeholder="Phone" value={venForm.phone_number} onChange={e => setVenForm({ ...venForm, phone_number: e.target.value })} required /><input placeholder="Location" value={venForm.location} onChange={e => setVenForm({ ...venForm, location: e.target.value })} required /><button className="btn-cta" type="submit">Save Vendor</button></form>)}
        {modal === 'fruit' && (<form className="form-stack" onSubmit={handleFruitSubmit}><input placeholder="Fruit Name" value={fruitForm.fruit_name} onChange={e => setFruitForm({ ...fruitForm, fruit_name: e.target.value })} required /><input placeholder="Description" value={fruitForm.description} onChange={e => setFruitForm({ ...fruitForm, description: e.target.value })} /><button className="btn-cta" type="submit">Add Fruit</button></form>)}
        {modal === 'purchase' && (<form className="form-stack" onSubmit={submitPurchase}><select value={purchaseSupId} onChange={e => setPurchaseSupId(e.target.value)} required><option value="">Select Supplier</option>{suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.business_name}</option>)}</select>{purchaseItems.map((it, idx) => (<div className="form-grid" key={idx}><select value={it.fruit_id} onChange={e => { const c = [...purchaseItems]; c[idx].fruit_id = e.target.value; setPurchaseItems(c); }} required><option value="">Fruit</option>{fruits.map(f => <option key={f.fruit_id} value={f.fruit_id}>{f.fruit_name}</option>)}</select><select value={it.packaging_size} onChange={e => { const c = [...purchaseItems]; c[idx].packaging_size = e.target.value; setPurchaseItems(c); }}><option value="Small">Small</option><option value="Medium">Medium</option><option value="Large">Large</option></select><input type="number" min="1" value={it.quantity} onChange={e => { const c = [...purchaseItems]; c[idx].quantity = e.target.value; setPurchaseItems(c); }} required /><input type="number" min="1" value={it.unit_cost} onChange={e => { const c = [...purchaseItems]; c[idx].unit_cost = e.target.value; setPurchaseItems(c); }} required /></div>))}<button type="submit" className="btn-cta">Complete Purchase</button></form>)}
        {modal === 'quickOrder' && (<form className="form-stack" onSubmit={submitSale}><select value={saleVendorId} onChange={e => setSaleVendorId(e.target.value)} required><option value="">Select Vendor</option>{vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}</select><div className="form-grid"><select value={saleMethod} onChange={e => setSaleMethod(e.target.value)}><option value="Cash">Cash</option><option value="Mobile Money">Mobile Money</option><option value="Credit">Credit</option></select><input type="number" min="0" placeholder="Paid (M)" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} /></div>{saleItems.map((it, idx) => (<div className="form-grid" key={idx}><select value={it.fruit_id} onChange={e => { const c = [...saleItems]; c[idx].fruit_id = e.target.value; setSaleItems(c); }} required><option value="">Fruit</option>{fruits.map(f => <option key={f.fruit_id} value={f.fruit_id}>{f.fruit_name}</option>)}</select><select value={it.packaging_size} onChange={e => { const c = [...saleItems]; c[idx].packaging_size = e.target.value; setSaleItems(c); }}><option value="Small">Small (M120)</option><option value="Medium">Medium (M220)</option><option value="Large">Large (M350)</option></select><input type="number" min="1" value={it.quantity} onChange={e => { const c = [...saleItems]; c[idx].quantity = e.target.value; setSaleItems(c); }} required /></div>))}<p style={{ fontWeight: 700, color: '#c84b26' }}>Total: M{saleTotal.toFixed(2)}</p><button type="submit" className="btn-cta">Confirm Sale</button></form>)}
      </div></div>)}
    </div>
  );
}
export default App;








































