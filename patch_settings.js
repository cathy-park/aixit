const fs = require('fs');
const path = './src/app/(app)/settings/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useNavOrder import
content = content.replace(
  'import { useNavVisibility } from "@/lib/use-nav-visibility";',
  'import { useNavVisibility, useNavOrder } from "@/lib/use-nav-visibility";'
);

// 2. Add useNavOrder inside component
content = content.replace(
  'const { isVisible, toggle } = useNavVisibility();',
  'const { isVisible, toggle } = useNavVisibility();\n  const { order, updateOrder } = useNavOrder();\n  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);\n\n  const orderedItems = [...APP_NAV_ITEMS].sort((a, b) => {\n    const idxA = order.indexOf(a.id);\n    const idxB = order.indexOf(b.id);\n    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);\n  });'
);

// 3. Add drag drop handlers
const dndHandlers = `
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const currentOrder = orderedItems.map(i => i.id);
    const draggedIdx = currentOrder.indexOf(draggedItemId);
    const targetIdx = currentOrder.indexOf(targetId);

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedItemId);

    updateOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };
`;

content = content.replace(
  'return (',
  dndHandlers + '\n  return ('
);

// 4. Update the map loop and add drag props
const oldMapStart = '{APP_NAV_ITEMS.map((item) => {';
const newMapStart = '{orderedItems.map((item) => {';
content = content.replace(oldMapStart, newMapStart);

// 5. Add draggable props to the div
const oldDiv = '                  <div\n                    key={item.id}\n                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"';
const newDiv = `                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragEnd={handleDragEnd}
                    className={\`flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-zinc-50 cursor-grab active:cursor-grabbing \${draggedItemId === item.id ? "opacity-50" : ""}\`}`;
content = content.replace(oldDiv, newDiv);

// 6. Add a grip icon to the row
const oldIconStart = `                    <div className="flex items-center gap-3">
                      <Icon
                        className="h-5 w-5 shrink-0 text-zinc-400"`;
const newIconStart = `                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-zinc-300 hover:text-zinc-500">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3C4 3.55228 3.55228 4 3 4C2.44772 4 2 3.55228 2 3C2 2.44772 2.44772 2 3 2C3.55228 2 4 2.44772 4 3ZM4 9C4 9.55228 3.55228 10 3 10C2.44772 10 2 9.55228 2 9C2 8.44772 2.44772 8 3 8C3.55228 8 4 8.44772 4 9ZM10 3C10 3.55228 9.55228 4 9 4C8.44772 4 8 3.55228 8 3C8 2.44772 8.44772 2 9 2C9.55228 2 10 2.44772 10 3ZM10 9C10 9.55228 9.55228 10 9 10C8.44772 10 8 9.55228 8 9C8 8.44772 8.44772 8 9 8C9.55228 8 10 8.44772 10 9Z" fill="currentColor"/></svg>
                      </div>
                      <Icon
                        className="h-5 w-5 shrink-0 text-zinc-400"`;
content = content.replace(oldIconStart, newIconStart);

fs.writeFileSync(path, content, 'utf8');
