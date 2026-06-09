const fs = require('fs');
const path = './src/components/minutes/MinutesView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Import InlineMinuteView
content = content.replace(
  'import { FolderSummaryEditor } from "./FolderSummaryEditor";',
  'import { FolderSummaryEditor } from "./FolderSummaryEditor";\nimport { InlineMinuteView } from "./InlineMinuteView";'
);

// 2. Add expandedMinuteId state
const hooksStr = '  const [ready, setReady] = useState(false);';
const newHooksStr = `  const [ready, setReady] = useState(false);
  const [expandedMinuteId, setExpandedMinuteId] = useState<string | null>(null);`;
content = content.replace(hooksStr, newHooksStr);

// 3. Clear expanded state on folder change
content = content.replace(
  'const handleFolderChange = useCallback(',
  'const handleFolderChange = useCallback(\n    (id: string) => {\n      setExpandedMinuteId(null);'
);
// Fix the replace above, handleFolderChange originally was:
//   const handleFolderChange = useCallback(
//     (id: string) => {
//       setActiveFolderId(id); ...

content = fs.readFileSync(path, 'utf8');
content = content.replace(
  'setActiveFolderId(id);',
  'setActiveFolderId(id);\n      setExpandedMinuteId(null);'
);

// 4. Change "+ 회의록 추가" link to button
const oldAddBtn = `<Link
                          href={\`/minutes/\${folder.id}/new\`}
                          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                        >
                          <PlusIcon className="w-4 h-4" /> 회의록 추가
                        </Link>`;
const newAddBtn = `<button
                          onClick={() => setExpandedMinuteId("new")}
                          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                        >
                          <PlusIcon className="w-4 h-4" /> 회의록 추가
                        </button>`;
content = content.replace(oldAddBtn, newAddBtn);

// 5. Change the list map to include the expanded view
const oldListMap = `{fMinutes.map((minute) => (
                            <Link
                              key={minute.id}
                              href={\`/minutes/\${folder.id}/\${minute.id}\`}
                              className="group flex items-center justify-between bg-white border border-zinc-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {minute.iconType === "meet" && <VideoIcon className="w-5 h-5 shrink-0 text-emerald-500" />}
                                {minute.iconType === "email" && <MailIcon className="w-5 h-5 shrink-0 text-amber-500" />}
                                {minute.iconType === "chat" && <MessageSquareIcon className="w-5 h-5 shrink-0 text-blue-500" />}
                                {(!minute.iconType || minute.iconType === "default") && <FileTextIcon className="w-5 h-5 shrink-0 text-zinc-400" />}
                                
                                <span className="font-medium text-zinc-900 truncate">
                                  {minute.title.trim() || "제목 없음"}
                                </span>

                                <div className="hidden sm:flex items-center gap-2 ml-4 shrink-0">
                                  {minute.attachments && minute.attachments.length > 0 && (
                                    <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                                      <PaperclipIcon className="w-3 h-3" /> {minute.attachments.length}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-zinc-400 shrink-0 ml-4 group-hover:text-blue-500 transition">
                                {minute.date}
                              </span>
                            </Link>
                          ))}`;

const newListMap = `{expandedMinuteId === "new" && (
                            <div className="mb-4 rounded-xl border-2 border-blue-200 shadow-sm overflow-hidden">
                              <InlineMinuteView 
                                folderId={folder.id} 
                                minuteId="new" 
                                onClose={() => {
                                  setExpandedMinuteId(null);
                                  refreshData();
                                }} 
                              />
                            </div>
                          )}
                          {fMinutes.map((minute) => (
                            <div key={minute.id} className="flex flex-col gap-2">
                              <button
                                onClick={() => setExpandedMinuteId(expandedMinuteId === minute.id ? null : minute.id)}
                                className={\`group flex items-center justify-between bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition \${expandedMinuteId === minute.id ? "border-blue-300 shadow-sm" : "border-zinc-200"}\`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {minute.iconType === "meet" && <VideoIcon className="w-5 h-5 shrink-0 text-emerald-500" />}
                                  {minute.iconType === "email" && <MailIcon className="w-5 h-5 shrink-0 text-amber-500" />}
                                  {minute.iconType === "chat" && <MessageSquareIcon className="w-5 h-5 shrink-0 text-blue-500" />}
                                  {(!minute.iconType || minute.iconType === "default") && <FileTextIcon className="w-5 h-5 shrink-0 text-zinc-400" />}
                                  
                                  <span className="font-medium text-zinc-900 truncate">
                                    {minute.title.trim() || "제목 없음"}
                                  </span>

                                  <div className="hidden sm:flex items-center gap-2 ml-4 shrink-0">
                                    {minute.attachments && minute.attachments.length > 0 && (
                                      <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                                        <PaperclipIcon className="w-3 h-3" /> {minute.attachments.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-zinc-400 shrink-0 ml-4 group-hover:text-blue-500 transition">
                                  {minute.date}
                                </span>
                              </button>
                              
                              {expandedMinuteId === minute.id && (
                                <div className="rounded-xl border-2 border-zinc-200 shadow-sm overflow-hidden mb-2">
                                  <InlineMinuteView 
                                    folderId={folder.id} 
                                    minuteId={minute.id} 
                                    onClose={() => {
                                      setExpandedMinuteId(null);
                                      refreshData();
                                    }} 
                                  />
                                </div>
                              )}
                            </div>
                          ))}`;

content = content.replace(oldListMap, newListMap);

fs.writeFileSync(path, content, 'utf8');
