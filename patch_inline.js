const fs = require('fs');
const path = './src/components/minutes/InlineMinuteView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove "use client"; and change imports
// Change useParams, useRouter
content = content.replace('import { useParams, useRouter } from "next/navigation";', '');

// 2. Change signature
content = content.replace(
  'export default function MinuteDetailClient({ params }: { params: { folderId: string; minuteId: string } }) {',
  `export function InlineMinuteView({ 
  folderId, 
  minuteId, 
  onClose 
}: { 
  folderId: string; 
  minuteId: string; 
  onClose: () => void; 
}) {`
);

// 3. Remove params logic
content = content.replace('  const { folderId, minuteId } = params;', '');
content = content.replace('  const router = useRouter();', '');

// 4. Change AppMainColumn and wrap
content = content.replace(
  '<AppMainColumn className="bg-zinc-50 min-h-dvh pt-6">',
  '<div className="w-full bg-zinc-50 border-t border-zinc-200 mt-0">'
);
content = content.replace(
  '</AppMainColumn>',
  '</div>'
);

// 5. Change the max-w container
content = content.replace(
  '<div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full flex flex-col h-full bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-zinc-200">',
  '<div className="p-4 sm:p-6 w-full flex flex-col bg-white">'
);

// 6. Change back link to close button
content = content.replace(
  /<div className="mb-6">[\s\S]*?<\/div>/,
  '' // remove back link since it's inline
);

// 7. On save success, call onClose if isNew, or just stay
content = content.replace(
  /router\.push\(\`\/minutes\/\$\{folder\.id\}\/\$\{newM\.id\}\`\);/g,
  'onClose();'
);

// 8. Delete minute handles onClose
content = content.replace(
  /router\.push\(\`\/minutes\/\$\{folder\.id\}\`\);/g,
  'onClose();'
);

// Add delete button next to edit/save
const deleteBtn = `
                <button onClick={async () => {
                  if (confirm("정말 이 회의록을 삭제하시겠습니까?")) {
                    await deleteMeetingMinute(minute.id);
                    onClose();
                  }
                }} className="flex items-center gap-1.5 rounded-lg bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition shadow-sm ml-2">
                  <XIcon className="w-4 h-4" />삭제
                </button>
`;
content = content.replace(
  /<button onClick=\{\(\) => setIsEditing\(true\)\} className="flex items-center gap-1\.5 rounded-lg bg-zinc-900/g,
  deleteBtn + '<button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 rounded-lg bg-zinc-900'
);

fs.writeFileSync(path, content, 'utf8');
