// Shop Page functionality for Morrow Objects
(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  function sortProducts(products, sortBy) {
    const sorted = [...products];
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return sorted;
    }
  }

  function showToast(message) {
    const toast = document.querySelector('.toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2600);
    }
  }

  function renderProducts(grid, products) {
    grid.innerHTML = products.map((product) => `
      <article class="product-card" data-category="${escapeHtml(product.category)}" data-name="${escapeHtml(product.name)}" data-price="${product.price}" data-description="${escapeHtml(product.description)}">
        <div class="product-image">
          ${product.tag ? `<span class="product-tag">${escapeHtml(product.tag)}</span>` : ''}
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.imageAlt)}" />
          <button class="quick-add" type="button" data-product="${escapeHtml(product.id)}">Quick add</button>
        </div>
        <a class="product-name" href="product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a>
        <div class="product-meta"><div><p>${escapeHtml(product.meta)}</p></div><strong>$${product.price}</strong></div>
      </article>
    `).join('');

    grid.querySelectorAll('.quick-add').forEach((button) => {
      button.addEventListener('click', () => {
        const product = products.find((item) => item.id === button.dataset.product);
        if (!product || !window.MorrowRouter) return;
        window.MorrowRouter.addToCart({ name: product.name, price: product.price, quantity: 1 });
        showToast(`${product.name} added to your bag`);
      });
    });
  }

  async function init() {
    const grid = document.getElementById('product-grid');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const sortSelect = document.getElementById('sort-select');

    if (!grid) return;

    let products;
    try {
      products = await window.MorrowProducts.ready;
      renderProducts(grid, products);
    } catch {
      grid.innerHTML = '<p class="product-error">The collection is temporarily unavailable.</p>';
      return;
    }

    let currentFilter = 'all';
    let currentSort = 'featured';

    function applyFiltersAndSort() {
      let filtered = currentFilter === 'all' ? [...products] : products.filter((p) => p.category === currentFilter);
      filtered = sortProducts(filtered, currentSort);

      grid.querySelectorAll('.product-card').forEach((card) => {
        const productId = card.querySelector('.quick-add')?.dataset.product;
        card.hidden = !filtered.some((product) => product.id === productId);
      });
    }

    filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        applyFiltersAndSort();
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        applyFiltersAndSort();
      });
    }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
