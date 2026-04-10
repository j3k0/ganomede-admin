interface PlaceholderProps {
  title: string;
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="rounded border border-dashed border-gray-300 p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      <p className="mt-2 text-gray-500">This page will be implemented in a future phase.</p>
    </div>
  );
}
