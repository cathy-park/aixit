const fs = require('fs');
let content = fs.readFileSync('src/components/minutes/InlineMinuteView.tsx', 'utf8');

// 1. Add isIconDropdownOpen state
content = content.replace(
  '  const [iconType, setIconType] = useState<MinuteIconType>("default");',
  '  const [iconType, setIconType] = useState<MinuteIconType>("default");\n  const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);'
);

// 2. Replace <select> with custom dropdown
const selectRegex = /<select[\s\S]*?<\/select>/;
const customDropdown = `
                <div className="relative">
                  <button
                    onClick={() => setIsIconDropdownOpen(!isIconDropdownOpen)}
                    className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex items-center justify-center hover:bg-zinc-50 transition min-w-[44px] h-[44px]"
                  >
                    {iconType === "meet" && <VideoIcon className="w-5 h-5 text-emerald-500" />}
                    {iconType === "email" && <MailIcon className="w-5 h-5 text-amber-500" />}
                    {iconType === "chat" && <MessageSquareIcon className="w-5 h-5 text-blue-500" />}
                    {(!iconType || iconType === "default") && <FileTextIcon className="w-5 h-5 text-zinc-400" />}
                  </button>
                  {isIconDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-white border border-zinc-200 shadow-lg rounded-xl z-50 overflow-hidden w-40 flex flex-col">
                      <button onClick={() => { setIconType("default"); setIsIconDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-sm text-zinc-700 w-full text-left">
                        <FileTextIcon className="w-4 h-4 text-zinc-400" /> 기본
                      </button>
                      <button onClick={() => { setIconType("meet"); setIsIconDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-sm text-zinc-700 w-full text-left">
                        <VideoIcon className="w-4 h-4 text-emerald-500" /> 화상
                      </button>
                      <button onClick={() => { setIconType("email"); setIsIconDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-sm text-zinc-700 w-full text-left">
                        <MailIcon className="w-4 h-4 text-amber-500" /> 이메일
                      </button>
                      <button onClick={() => { setIconType("chat"); setIsIconDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 text-sm text-zinc-700 w-full text-left">
                        <MessageSquareIcon className="w-4 h-4 text-blue-500" /> 챗봇(말풍선)
                      </button>
                    </div>
                  )}
                </div>
`;
content = content.replace(selectRegex, customDropdown.trim());

// 3. Remove Date Row from below Title Row
const dateRowRegex = /\{\/\* Date Row \*\/\}[\s\S]*?<\/div>\n\n/;
content = content.replace(dateRowRegex, '');

// 4. Move Date rendering into the action buttons area
// In the !isNew && !isEditing block:
const viewDateCode = `
                <div className="flex items-center gap-1.5 text-sm text-zinc-500 mr-2 font-medium bg-zinc-100/50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{date}</span>
                </div>
`;
content = content.replace(
  '<button onClick={handleCopyMarkdown}',
  viewDateCode.trim() + '\n                <button onClick={handleCopyMarkdown}'
);

// In the isEditing block:
const editDateCode = `
                <div className="flex items-center gap-1.5 mr-2">
                  <CalendarIcon className="w-4 h-4 text-zinc-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm text-zinc-700 border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none w-[130px]"
                  />
                </div>
`;
content = content.replace(
  '                {!isNew && (',
  editDateCode.trim() + '\n                {!isNew && ('
);

fs.writeFileSync('src/components/minutes/InlineMinuteView.tsx', content, 'utf8');
