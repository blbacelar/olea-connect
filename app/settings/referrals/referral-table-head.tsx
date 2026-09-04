export function ReferralTableHead({ columns }: { columns: string[] }) {
  return (
    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
      <tr>
        {columns.map((column) => (
          <th key={column} className="px-4 py-3">
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}
