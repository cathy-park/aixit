const fs = require('fs');

const faviconComponent = `
function FaviconImage({ url }: { url: string }) {
  const [error, setError] = useState(false);
  const getFaviconUrl = (u: string) => {
    try { return \`https://www.google.com/s2/favicons?domain=\${new URL(u).hostname}&sz=64\`; }
    catch { return null; }
  };
  const favUrl = getFaviconUrl(url);

  if (!favUrl || error) return <LinkIcon className="w-4 h-4 shrink-0" />;
  return <img src={favUrl} alt="" className="w-4 h-4 shrink-0 rounded-sm bg-white" onError={() => setError(true)} />;
}
`;

function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  if (!content.includes('FaviconImage')) {
    // Add FaviconImage component after imports
    const importMatch = content.match(/import.*?from.*?;/g);
    const lastImport = importMatch[importMatch.length - 1];
    content = content.replace(lastImport, lastImport + '\n' + faviconComponent);
  }

  // Replace <LinkIcon className="w-4 h-4 shrink-0" /> when it's inside link.url maps
  // In MinutesView.tsx and InlineMinuteView.tsx
  content = content.replace(/<LinkIcon className="w-4 h-4 shrink-0" \/>/g, '<FaviconImage url={link.url} />');
  
  fs.writeFileSync(path, content, 'utf8');
}

processFile('src/components/minutes/InlineMinuteView.tsx');
processFile('src/components/minutes/MinutesView.tsx');
