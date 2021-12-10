const { getConfig } = require('./config');

const getSort = (order, sortField = 'productPrice') => {
   const config = getConfig();
   let sortOrder = 1;
   if (order) {
      if (order === 'asc') {
         sortOrder = 1;
      }
   } else {
      if (config.productOrder === 'ascending') {
         sortOrder = 1;
      }
   }
   if (!sortField) {
      if (config.productOrderBy === 'title') {
         sortField = 'productTitle';
      }
   }
   return {
      [sortField]: sortOrder,
   };
};

module.exports = {
   getSort,
};
