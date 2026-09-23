// Shared Product Data for Morrow Objects
(function () {
  'use strict';

  let products = [];
  let loadError = null;

  const ready = window.MorrowApi
    ? window.MorrowApi.apiRequest('/api/products')
        .then((response) => {
          products = Array.isArray(response.products) ? response.products : [];
          return products;
        })
        .catch((error) => {
          loadError = error;
          throw error;
        })
    : Promise.reject(new Error('The product service is unavailable.'));

  function getAll() {
    return products;
  }

  function getById(id) {
    return products.find((product) => product.id === id);
  }

  function getByName(name) {
    return products.find((product) => product.name === name);
  }

  function getByCategory(category) {
    return products.filter((product) => product.category === category);
  }

  function getRelated(product, limit = 4) {
    return products
      .filter((item) => item.category === product.category && item.id !== product.id)
      .slice(0, limit);
  }

  function search(query) {
    const q = query.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.meta.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q)
    );
  }

  window.MorrowProducts = {
    ready,
    getAll,
    getById,
    getByName,
    getByCategory,
    getRelated,
    search,
    getError: () => loadError,
  };
})();