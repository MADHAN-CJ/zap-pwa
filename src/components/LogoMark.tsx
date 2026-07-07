// Filled green Zap mark (logo-fill-green.svg), inlined. Self-colored — ignores
// currentColor — so it reads on dark or light surfaces.
export default function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 243.32 255.09"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="zapmark-g1"
          x1="131.63"
          y1="266.31"
          x2="28.87"
          y2="151.69"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#1abe5f" />
          <stop offset=".72" stopColor="#067432" />
          <stop offset="1" stopColor="#003a17" />
        </linearGradient>
        <linearGradient
          id="zapmark-g2"
          x1="103.44"
          y1="-27.8"
          x2="222.3"
          y2="113.13"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#1abe5f" />
          <stop offset=".72" stopColor="#067432" />
          <stop offset="1" stopColor="#003a17" />
        </linearGradient>
      </defs>
      <path
        fill="url(#zapmark-g1)"
        d="M140.85,243.17c3.31,4.54.39,10.92-5.21,11.43-28.06,2.56-58.04-4.92-81.03-20.82-38.11-24.3-40.53-87.37-4.76-115.35l91.01,124.74Z"
      />
      <path
        fill="url(#zapmark-g2)"
        d="M217.36,89c-2.26,18.15-10.96,33.93-23.53,45.33L98.98,12.48c-3.45-4.43-.73-10.9,4.85-11.59,27.98-3.44,58.17,3.12,81.65,18.29,22.55,14.56,35.29,41.63,31.88,69.82Z"
      />
      <path
        fill="#1abe5f"
        d="M1.57,111.83c-7.48,44.78,12.19,92.35,48.89,119.01-56.49-47.34-14.61-136.12,52.87-129.92,6.15.56,10.06-6.44,6.42-11.43l-44.04-60.37c-2.26-3.1-6.56-3.89-9.78-1.78C27.04,46.27,6.69,77.61,1.57,111.83Z"
      />
      <path
        fill="#1abe5f"
        d="M242.29,139.42c6.08-44.99-15.06-91.93-52.57-117.43,57.94,45.56,18.84,135.6-48.8,131.51-6.16-.37-9.86,6.75-6.06,11.62l45.9,58.97c2.36,3.03,6.68,3.68,9.83,1.48,28.28-19.82,47.65-51.77,51.7-86.14Z"
      />
    </svg>
  );
}
