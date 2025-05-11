import { SVGProps } from 'react';

export function KvantAppMiniIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="36"
      height="35"
      viewBox="0 0 36 35"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M0 9.33333C0 4.17861 4.21373 0 9.41177 0H25.8824C31.0804 0 35.2941 4.17861 35.2941 9.33333V25.6667C35.2941 30.8214 31.0804 35 25.8824 35H9.41177C4.21373 35 0 30.8214 0 25.6667V9.33333Z"
        fill="#141414"
      />
      <path
        d="M0 9.70587H22.6471C18.4782 9.70587 15.098 13.1957 15.098 17.5C15.098 21.8043 18.4782 25.2941 22.6471 25.2941H0V9.70587Z"
        fill="url(#paint0_radial_1486_48)"
      />
      <path
        d="M30.5882 17.5C30.5882 13.1957 27.0983 9.70587 22.7941 9.70587C18.4899 9.70587 15 13.1957 15 17.5C15 21.8043 18.4899 25.2941 22.7941 25.2941C27.0983 25.2941 30.5882 21.8043 30.5882 17.5Z"
        fill="white"
      />
      <defs>
        <radialGradient
          id="paint0_radial_1486_48"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(22.6471 17.5) scale(22.6471 15.5882)"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
