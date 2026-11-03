export default function Banniere({
  texte,
  type,
}: {
  texte: string | null;
  type: "succes" | "erreur";
}) {
  if (!texte) return null;
  const style =
    type === "succes"
      ? "border-green-500 bg-green-500/10 text-green-600"
      : "border-red-500 bg-red-500/10 text-red-500";
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg border shadow-lg backdrop-blur font-semibold whitespace-nowrap ${style}`}
    >
      {texte}
    </div>
  );
}
