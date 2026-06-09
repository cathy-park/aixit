const fs = require('fs');
let content = fs.readFileSync('src/components/minutes/InlineMinuteView.tsx', 'utf8');

content = content.replace(
  'export default function MeetingMinuteEditorPage() {\\n  const params = useParams();\\n\\n  const folderId = typeof params?.folderId === "string" ? params.folderId : "";\\n  const minuteId = typeof params?.minuteId === "string" ? params.minuteId : "";',
  'export function InlineMinuteView({ folderId, minuteId, onClose }: { folderId: string, minuteId: string, onClose: () => void }) {'
);

content = content.replace(/router\.replace/g, 'onClose(); // router.replace');

// also import deleteMeetingMinute
content = content.replace(
  '  updateMeetingMinute,',
  '  updateMeetingMinute,\\n  deleteMeetingMinute,'
);

fs.writeFileSync('src/components/minutes/InlineMinuteView.tsx', content, 'utf8');
