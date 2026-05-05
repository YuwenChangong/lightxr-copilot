export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-center px-4 py-2.5 bg-[#f9f9fb]/80 backdrop-blur-xl border-b border-[var(--separator)]">
      <h1 className="text-[17px] font-semibold tracking-tight text-[var(--label)]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
        Gaze Prototype
      </h1>
    </header>
  );
}