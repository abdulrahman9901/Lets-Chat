export function formatMessageTimestamp(ts: string): string {
	const diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
	const d = new Date(ts);
	if (diff < 1) return 'just now...';
	if (diff < 60) return diff < 2 ? 'one min. ago' : `${diff} mins. ago`;
	if (diff < 24 * 60) return diff < 120 ? 'one hour ago' : `${Math.round(diff / 60)} hours ago`;
	if (diff < 31 * 24 * 60)
		return diff < 48 * 60 ? 'a day ago' : `${Math.round(diff / (60 * 24))} days ago`;
	return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}`;
}
