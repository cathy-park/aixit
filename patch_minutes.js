const fs = require('fs');
const path = './src/components/minutes/MinutesView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import for FolderSummaryEditor
content = content.replace(
  'import { FolderFormModal } from "@/components/dashboard/FolderFormModal";',
  'import { FolderFormModal } from "@/components/dashboard/FolderFormModal";\nimport { FolderSummaryEditor } from "./FolderSummaryEditor";'
);

// 2. Fix workflowCount
content = content.replace(
  'workflowCount: 0',
  'workflowCount: minutes.filter(m => m.folderId === f.id).length'
);

// 3. Replace the folder section with accordion
const oldSection = `                    <div className="flex flex-col gap-3 pl-2 sm:pl-4 mb-4">
                      {/* 폴더 공통 자료 영역 */}
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 mb-2">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                            <PaperclipIcon className="w-4 h-4 text-zinc-500" /> 관련 링크 및 계약서
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddFolderLink(folder.id)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-md"
                            >
                              + 링크
                            </button>
                            <button
                              onClick={() => {
                                setUploadingFolderId(folder.id);
                                fileInputRef.current?.click();
                              }}
                              disabled={uploadingFolderId === folder.id}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 px-2 py-1 rounded-md disabled:opacity-50"
                            >
                              + 파일
                            </button>
                          </div>
                        </div>

                        {!hasFolderData ? (
                          <p className="text-xs text-zinc-400">등록된 공통 링크나 자료가 없습니다.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {links.map((link) => (
                              <div key={link.id} className="flex items-center justify-between group rounded-lg bg-white px-3 py-2 text-sm border border-zinc-200 shadow-sm">
                                <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-700 hover:underline min-w-0 flex-1">
                                  <LinkIcon className="w-4 h-4 shrink-0 text-indigo-400" />
                                  <span className="truncate">{link.title}</span>
                                </a>
                                <button
                                  onClick={() => handleDeleteFolderLink(folder.id, link.id)}
                                  className="text-zinc-300 hover:text-red-600 transition ml-2 shrink-0 opacity-0 group-hover:opacity-100"
                                  title="삭제"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {attachments.map((att) => (
                              <div key={att.id} className="flex items-center justify-between group rounded-lg bg-white px-3 py-2 text-sm border border-zinc-200 shadow-sm">
                                <button
                                  onClick={() => handleDownloadAttachment(att.storagePath)}
                                  className="flex items-center gap-2 text-blue-700 hover:underline min-w-0 flex-1 text-left"
                                >
                                  <FileTextIcon className="w-4 h-4 shrink-0 text-blue-400" />
                                  <span className="truncate">{att.name}</span>
                                  <span className="text-xs text-zinc-400 ml-1 shrink-0">({Math.round(att.size / 1024)} KB)</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteFolderAttachment(folder.id, att.id, att.storagePath)}
                                  className="text-zinc-300 hover:text-red-600 transition ml-2 shrink-0 opacity-0 group-hover:opacity-100"
                                  title="삭제"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3">
                          <textarea
                            className="w-full text-sm border border-transparent bg-transparent hover:border-zinc-200 focus:border-zinc-300 focus:bg-white rounded-lg p-2 transition resize-y min-h-[60px]"
                            placeholder="이 폴더에 대한 요약이나 메모를 마크다운으로 간략히 작성해 보세요..."
                            defaultValue={folder.summary}
                            onBlur={(e) => {
                              if (e.target.value !== folder.summary) {
                                updateMinutesFolder(folder.id, { summary: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>`;

const newSection = `                    <div className="flex flex-col gap-3 pl-2 sm:pl-4 mb-4">
                      {/* 폴더 공통 자료 영역 */}
                      <details className="group rounded-xl border border-zinc-200 bg-zinc-50/50 mb-2" open>
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                          <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                            <PaperclipIcon className="w-4 h-4 text-zinc-500" /> 관련 링크 및 계약서
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                              <button
                                onClick={(e) => { e.preventDefault(); handleAddFolderLink(folder.id); }}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-md"
                              >
                                + 링크
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setUploadingFolderId(folder.id);
                                  fileInputRef.current?.click();
                                }}
                                disabled={uploadingFolderId === folder.id}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 px-2 py-1 rounded-md disabled:opacity-50"
                              >
                                + 파일
                              </button>
                            </div>
                            <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </summary>
                        
                        <div className="px-4 pb-4 border-t border-zinc-100 pt-3">
                          {!hasFolderData ? (
                            <p className="text-xs text-zinc-400">등록된 공통 링크나 자료가 없습니다.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {links.map((link) => (
                                <div key={link.id} className="flex items-center justify-between group/link rounded-lg bg-white px-3 py-2 text-sm border border-zinc-200 shadow-sm">
                                  <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-700 hover:underline min-w-0 flex-1">
                                    <LinkIcon className="w-4 h-4 shrink-0 text-indigo-400" />
                                    <span className="truncate">{link.title}</span>
                                  </a>
                                  <button
                                    onClick={() => handleDeleteFolderLink(folder.id, link.id)}
                                    className="text-zinc-300 hover:text-red-600 transition ml-2 shrink-0 opacity-0 group-hover/link:opacity-100"
                                    title="삭제"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              {attachments.map((att) => (
                                <div key={att.id} className="flex items-center justify-between group/att rounded-lg bg-white px-3 py-2 text-sm border border-zinc-200 shadow-sm">
                                  <button
                                    onClick={() => handleDownloadAttachment(att.storagePath)}
                                    className="flex items-center gap-2 text-blue-700 hover:underline min-w-0 flex-1 text-left"
                                  >
                                    <FileTextIcon className="w-4 h-4 shrink-0 text-blue-400" />
                                    <span className="truncate">{att.name}</span>
                                    <span className="text-xs text-zinc-400 ml-1 shrink-0">({Math.round(att.size / 1024)} KB)</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFolderAttachment(folder.id, att.id, att.storagePath)}
                                    className="text-zinc-300 hover:text-red-600 transition ml-2 shrink-0 opacity-0 group-hover/att:opacity-100"
                                    title="삭제"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3">
                            <FolderSummaryEditor 
                              initialSummary={folder.summary}
                              onSave={(val) => {
                                updateMinutesFolder(folder.id, { summary: val });
                                refreshData();
                              }}
                            />
                          </div>
                        </div>
                      </details>`;

content = content.replace(oldSection, newSection);
fs.writeFileSync(path, content, 'utf8');
