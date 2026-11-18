interface Outlet {
  id: string;
  name: string;
}

export function OutletSelect({
  cafes,
  value,
  onChange,
}: {
  cafes: Outlet[];
  value: string;
  onChange: (cafeId: string) => void;
}) {
  if (cafes.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-stone-500">
      Outlet
      <select className="input max-w-[220px] py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
        {cafes.map((cafe) => (
          <option key={cafe.id} value={cafe.id}>
            {cafe.name}
          </option>
        ))}
      </select>
    </label>
  );
}
