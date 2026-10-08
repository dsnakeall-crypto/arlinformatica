export default function PersonPortrait({ kind }: { kind: 'man' | 'woman' | 'couple' }) {
  const portrait = (woman: boolean) => <>
    {woman && <path d="M12 25V16a12 12 0 0 1 24 0v16H12Z" fill="#30344e" />}
    <path d="M6 46v-5c0-8 8-13 18-13s18 5 18 13v5Z" fill="#f4f8ff" />
    <path d="M19 26h10v7l-5 4-5-4Z" fill="#efb99b" />
    <ellipse cx="24" cy="18" rx="9" ry="11" fill="#ffdbc4" />
    {woman ? <path d="M14 16c0-8 5-12 11-12 7 0 11 6 10 14-5-1-9-5-11-8-2 4-6 6-10 6Z" fill="#30344e" /> : <path d="M15 15V9c2-6 14-8 18-2l1 8-5-5-7 2Z" fill="#30344e" />}
    <circle cx="21" cy="19" r="1" fill="#30344e" /><circle cx="27" cy="19" r="1" fill="#30344e" />
    <path d="M21 24q3 2 6 0" fill="none" stroke="#ae715e" strokeWidth="1.2" strokeLinecap="round" />
    {woman ? <path d="m17 31 7 6 7-6" fill="none" stroke="#ce4a7c" strokeWidth="2" /> : <path d="m24 35-2 3 2 7 2-7Z" fill="#c9002c" />}
  </>;
  return <svg className="cg-person-portrait" viewBox="0 0 48 48" aria-hidden="true">{kind === 'couple' ? <><g transform="translate(-1 9) scale(.65)">{portrait(false)}</g><g transform="translate(18 8) scale(.65)">{portrait(true)}</g></> : portrait(kind === 'woman')}</svg>;
}
