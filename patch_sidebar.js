const fs = require('fs');

function applyOrder(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // import useNavOrder
  if (!content.includes('useNavOrder')) {
    content = content.replace('useNavVisibility }', 'useNavVisibility, useNavOrder }');
  }

  // extract order
  if (content.includes('const { isVisible } = useNavVisibility();')) {
    content = content.replace('const { isVisible } = useNavVisibility();', 'const { isVisible } = useNavVisibility();\n  const { order } = useNavOrder();');
  }

  // order items
  const sortLogic = `const orderedItems = [...APP_NAV_ITEMS].sort((a, b) => {
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });`;
  
  if (!content.includes('orderedItems')) {
    content = content.replace('const { order } = useNavOrder();', 'const { order } = useNavOrder();\n  ' + sortLogic);
  }

  // replace APP_NAV_ITEMS.filter -> orderedItems.filter
  content = content.replace(/APP_NAV_ITEMS\.filter/g, 'orderedItems.filter');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

applyOrder('./src/components/layout/PrimarySidebar.tsx');
applyOrder('./src/components/layout/MobileTopNav.tsx');
