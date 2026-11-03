import Image from "next/image";

export default function ImageProduit({
  src,
  alt,
  className = "",
  width = 64,
  height = 64,
  ajustement = "cover",
}: {
  src?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  ajustement?: "cover" | "contain";
}) {
  if (!src) {
    return (
      <div
        className={`bg-surface border border-line rounded-lg flex items-center justify-center text-muted font-black text-xl ${className}`}
        aria-hidden="true"
      >
        {alt.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return <Image src={src} alt={alt} width={width} height={height} className={`object-${ajustement} rounded-lg ${className}`} />;
}
