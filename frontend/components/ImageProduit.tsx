import Image from "next/image";

export default function ImageProduit({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
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
  return <Image src={src} alt={alt} width={64} height={64} className={`object-cover rounded-lg ${className}`} />;
}
