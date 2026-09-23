// Product Detail Page functionality for Morrow Objects
(function () {
  'use strict';

  let products = [];

  async function loadProducts() {
    products = await window.MorrowProducts.ready;
  }

  function getProductFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) return id;
    const name = params.get('name');
    if (name) return name;
    // Also check hash-based routing
    const hash = window.location.hash;
    if (hash.startsWith('#/product/')) {
      return decodeURIComponent(hash.replace('#/product/', ''));
    }
    return null;
  }

  function showToast(message) {
    const toast = document.querySelector('.toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2600);
    }
  }

  function renderProductDetail(product) {
    const imageEl = document.getElementById('product-image');
    const titleEl = document.getElementById('product-title');
    const categoryEl = document.getElementById('product-category');
    const descriptionEl = document.getElementById('product-description');
    const priceEl = document.getElementById('product-price');
    const breadcrumbCurrent = document.querySelector('.breadcrumb-current');

    if (imageEl) {
      imageEl.src = product.image;
      imageEl.alt = product.imageAlt;
    }
    if (titleEl) titleEl.textContent = product.name;
    if (categoryEl) {
      categoryEl.textContent = product.category.charAt(0).toUpperCase() + product.category.slice(1);
    }
    if (descriptionEl) descriptionEl.textContent = product.description;
    if (priceEl) priceEl.textContent = `$${product.price}`;
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

    document.title = `${product.name} | Morrow Objects`;
  }

  function renderRelatedProducts(currentProduct) {
    const grid = document.getElementById('related-grid');
    if (!grid || !window.MorrowProducts) return;

    const related = window.MorrowProducts.getRelated(currentProduct, 4);

    grid.innerHTML = related
      .map(
        (product) => `
        <article class="product-card" data-category="${product.category}" data-name="${product.name}" data-price="${product.price}" data-description="${product.description}">
          <div class="product-image">
            ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ''}
            <img src="${product.image}" alt="${product.imageAlt}" />
            <button class="quick-add" type="button" data-product="${product.id}">Quick add</button>
          </div>
          <a class="product-name" href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a>
          <div class="product-meta">
            <div>
              <p>${product.meta}</p>
            </div>
            <strong>$${product.price}</strong>
          </div>
        </article>
      `
      )
      .join('');

    // Quick add for related products
    grid.querySelectorAll('.quick-add').forEach((button) => {
      button.addEventListener('click', () => {
        const product = products.find((p) => p.id === button.dataset.product);
        if (product && window.MorrowRouter) {
          window.MorrowRouter.addToCart({
            name: product.name,
            price: product.price,
            quantity: 1,
          });
          showToast(`${product.name} added to your bag`);
        }
      });
    });

    // Product name links
    grid.querySelectorAll('.product-name').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const productName = link.textContent.trim();
        if (window.MorrowRouter) {
          window.MorrowRouter.navigate(`/product/${encodeURIComponent(link.closest('.product-card').querySelector('.quick-add').dataset.product)}`);
        }
      });
    });
  }

  async function init() {
    try {
      await loadProducts();
    } catch {
      if (window.MorrowRouter) window.MorrowRouter.navigate('/shop');
      return;
    }
    const productName = getProductFromUrl();
    const product = products.find((p) => p.id === productName || p.name === productName);

    if (!product) {
      // Redirect to shop if product not found
      if (window.MorrowRouter) {
        window.MorrowRouter.navigate('/shop');
      } else {
        window.location.href = 'shop.html';
      }
      return;
    }

    renderProductDetail(product);
    renderRelatedProducts(product);

    let quantity = 1;
    const qtyDecrease = document.getElementById('qty-decrease');
    const qtyIncrease = document.getElementById('qty-increase');
    const qtyValue = document.getElementById('qty-value');
    const addToBagBtn = document.getElementById('add-to-bag');

    if (qtyDecrease) {
      qtyDecrease.addEventListener('click', () => {
        if (quantity > 1) {
          quantity--;
          if (qtyValue) qtyValue.textContent = quantity;
        }
      });
    }

    if (qtyIncrease) {
      qtyIncrease.addEventListener('click', () => {
        quantity++;
        if (qtyValue) qtyValue.textContent = quantity;
      });
    }

    if (addToBagBtn) {
      addToBagBtn.addEventListener('click', () => {
        if (window.MorrowRouter) {
          window.MorrowRouter.addToCart({
            name: product.name,
            price: product.price,
            quantity: quantity,
          });
          showToast(`${product.name} added to your bag`);
        }
        quantity = 1;
        if (qtyValue) qtyValue.textContent = quantity;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
