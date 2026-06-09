import React, { useState } from 'react';
import { Plus, Edit3, ShoppingBag, Eye } from 'lucide-react';

export default function ProductCatalog({ products, addProduct, updateProduct }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // State para el formulario de producto nuevo/editado
  const [formData, setFormData] = useState({
    name: '',
    category: 'Lubricante',
    price: '',
    stock: '',
    description: '',
    image_url: 'https://www.sexloop.pe/images/logo-sexloop.png'
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      category: 'Lubricante',
      price: '',
      stock: '',
      description: '',
      image_url: 'https://www.sexloop.pe/images/logo-sexloop.png'
    });
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      description: product.description || '',
      image_url: product.image_url || 'https://www.sexloop.pe/images/logo-sexloop.png'
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const productPayload = {
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      description: formData.description,
      image_url: formData.image_url
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct(productPayload);
    }
    setShowAddModal(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Catálogo de Productos de SexLoop.pe</h2>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Agregar Producto
        </button>
      </div>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-img-container">
              <img 
                src={product.image_url || 'https://www.sexloop.pe/images/logo-sexloop.png'} 
                alt={product.name} 
                className="product-img"
                onError={(e) => { e.target.src = 'https://www.sexloop.pe/images/logo-sexloop.png'; }}
              />
              <span className="product-category-badge">{product.category}</span>
            </div>

            <div className="product-card-body">
              <div>
                <h3 className="product-card-title">{product.name}</h3>
                <p className="product-card-desc">{product.description || 'Sin descripción disponible.'}</p>
              </div>

              <div className="product-card-footer">
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>Precio</span>
                  <span className="product-price">S/ {Number(product.price).toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`product-stock ${product.stock <= 5 ? 'low' : ''}`}>
                    Stock: {product.stock} unds
                  </span>
                  <button 
                    onClick={() => handleOpenEdit(product)}
                    style={{ 
                      display: 'block', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--violeta)', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      cursor: 'pointer', 
                      marginTop: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Crear/Editar Producto */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Lubricante anal aroma chicle Erosex"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Lubricante">Lubricante</option>
                    <option value="Retardante">Retardante</option>
                    <option value="Potenciador">Potenciador</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Precio (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="39.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Stock Inicial</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="20"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL de Imagen</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles del producto, empaque discreto, compatibilidad, etc."
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Guardar Cambios' : 'Añadir Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
